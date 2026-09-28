import cds from '@sap/cds'
import {
  runClassification,
  getNonAdopterList,
  getTeamHeatmap,
  getPeerComparison,
  getCoEStats,
  calcEstimatedHours
} from './handlers/classification.js'
import { ingestBTPAuditLog, ingestAICore } from './handlers/ingestion.js'
import { runWeeklyDigest }     from './jobs/weekly-digest.js'
import { runMonthlyReport }    from './jobs/monthly-report.js'
import { runNudgeNotifications } from './jobs/nudge-notifications.js'

const LOG = cds.log('adoption-service')

/**
 * Shift all seed session dates so they are always relative to today.
 * This prevents demo data from going stale — sessions that should be
 * "within 30 days" will always remain within 30 days regardless of
 * when the app is started.
 *
 * Strategy: find the most recent session date across all data, calculate
 * the offset to today, and shift every session date by that offset.
 * This preserves the relative spacing between sessions.
 */
async function normaliseSeedDates() {
  const { UsageSessions } = cds.entities('adoption')
  const today = new Date().toISOString().split('T')[0]

  const [latest] = await SELECT.from(UsageSessions)
    .columns('sessionDate')
    .orderBy({ sessionDate: 'desc' })
    .limit(1)

  if (!latest?.sessionDate) return
  if (latest.sessionDate >= today) return // already up to date

  const offsetDays = Math.floor(
    (new Date(today) - new Date(latest.sessionDate)) / (1000 * 60 * 60 * 24)
  )
  if (offsetDays <= 0) return

  const allSessions = await SELECT.from(UsageSessions).columns('ID', 'sessionDate')
  for (const s of allSessions) {
    const shifted = new Date(new Date(s.sessionDate).getTime() + offsetDays * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    await UPDATE(UsageSessions, s.ID).with({ sessionDate: shifted })
  }
  LOG.info(`Seed dates normalised — shifted ${allSessions.length} sessions by ${offsetDays} days`)
}

// ── Scheduling helpers ─────────────────────────────────────────────────────
function msUntilNextUtcTime(hour, minute) {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(hour, minute, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next - now
}

function scheduleDaily(hour, minute, label, fn) {
  const run = async () => {
    LOG.info(`Running scheduled job: ${label}`)
    await fn()
    setTimeout(run, msUntilNextUtcTime(hour, minute))
  }
  setTimeout(run, msUntilNextUtcTime(hour, minute))
}

function scheduleWeeklyMonday(hour, minute, label, fn) {
  const run = async () => {
    LOG.info(`Running scheduled job: ${label}`)
    await fn()
    // Schedule next Monday
    const now = new Date()
    const next = new Date(now)
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
    next.setUTCDate(now.getUTCDate() + daysUntilMonday)
    next.setUTCHours(hour, minute, 0, 0)
    setTimeout(run, next - now)
  }
  const now = new Date()
  const next = new Date(now)
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
  next.setUTCDate(now.getUTCDate() + daysUntilMonday)
  next.setUTCHours(hour, minute, 0, 0)
  setTimeout(run, next - now)
}

function scheduleMonthlyFirst(hour, minute, label, fn) {
  const run = async () => {
    LOG.info(`Running scheduled job: ${label}`)
    await fn()
    const now = new Date()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, hour, minute, 0))
    setTimeout(run, next - now)
  }
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, hour, minute, 0))
  setTimeout(run, next - now)
}

export default class AdoptionService extends cds.ApplicationService {
  async init() {

    const { UsageSessions, Notifications } = this.entities

    // ── logManualSession ───────────────────────────────────────────────────
    this.on('logManualSession', async req => {
      const { toolID, taskType, sessionDate, durationMinutes, selfReportedHoursSaved } = req.data
      if (!toolID || !durationMinutes || durationMinutes <= 0)
        return req.reject(400, 'toolID and durationMinutes are required and durationMinutes must be > 0')

      const { AITools } = cds.entities('adoption')
      const tool = await SELECT.one.from(AITools).where({ ID: toolID })
      if (!tool) return req.reject(404, 'Tool not found')

      const estimatedHoursSaved = calcEstimatedHours(durationMinutes, tool.name)
      const session = {
        ID:                     cds.utils.uuid(),
        consultant_ID:          req.user.id ?? 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tool_ID:                toolID,
        sessionDate:            sessionDate ?? new Date().toISOString().split('T')[0],
        durationMinutes,
        estimatedHoursSaved,
        selfReportedHoursSaved: selfReportedHoursSaved ?? null,
        source:                 'Manual',
        taskType:               taskType ?? 'Other'
      }
      await INSERT.into(UsageSessions).entries(session)
      return session
    })

    // ── updateMyProfile ───────────────────────────────────────────────────
    this.on('updateMyProfile', async req => {
      const { name, email, jobTitle, businessUnit, department, managerName, joinDate } = req.data
      const consultantID = req.user.id ?? 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      const { Consultants } = cds.entities('adoption')

      const existing = await SELECT.one.from(Consultants).where({ ID: consultantID })
      if (!existing) return req.reject(404, 'Consultant profile not found')

      const updates = {}
      if (name         != null) updates.name         = name
      if (email        != null) updates.email        = email
      if (jobTitle     != null) updates.jobTitle     = jobTitle
      if (businessUnit != null) updates.businessUnit = businessUnit
      if (department   != null) updates.department   = department
      if (managerName  != null) updates.managerName  = managerName
      if (joinDate     != null) updates.joinDate     = joinDate

      await UPDATE(Consultants, consultantID).with(updates)
      return await SELECT.one.from(Consultants).where({ ID: consultantID })
    })

    // ── addAITool ─────────────────────────────────────────────────────────
    this.on('addAITool', async req => {
      const { name, description, category, rolloutDate, licensedUsersCount } = req.data
      if (!name) return req.reject(400, 'Tool name is required')

      const { AITools } = cds.entities('adoption')
      const tool = {
        ID:                 cds.utils.uuid(),
        name,
        description:        description ?? '',
        dataSource:         'Manual',
        category:           category ?? 'Other',
        rolloutDate:        rolloutDate ?? null,
        licensedUsersCount: licensedUsersCount ?? null
      }
      await INSERT.into(AITools).entries(tool)
      return tool
    })

    // ── adjustHoursSaved ──────────────────────────────────────────────────
    this.on('adjustHoursSaved', async req => {
      const { sessionID, adjustedHours } = req.data
      if (!sessionID || adjustedHours == null)
        return req.reject(400, 'sessionID and adjustedHours are required')
      if (adjustedHours < 0)
        return req.reject(400, 'adjustedHours must be >= 0')

      const n = await UPDATE(UsageSessions, sessionID).with({ consultantAdjustedHours: adjustedHours })
      if (!n) return req.reject(404, 'Session not found')

      return await SELECT.one.from(UsageSessions).where({ ID: sessionID })
    })

    // ── runClassification ─────────────────────────────────────────────────
    this.on('runClassification', async req => {
      return await runClassification()
    })

    // ── bulkUpload ────────────────────────────────────────────────────────
    this.on('bulkUpload', async req => {
      const { entityName, records: recordsJson } = req.data

      let records
      try {
        records = typeof recordsJson === 'string' ? JSON.parse(recordsJson) : recordsJson
      } catch {
        return req.reject(400, 'records must be a valid JSON string')
      }

      if (!Array.isArray(records) || records.length === 0)
        return req.reject(400, 'records must be a non-empty array')

      const ns = cds.entities('adoption')
      const ENTITY_MAP = {
        Users:             ns.Consultants,
        Sessions:          ns.UsageSessions,
        Ideas:             ns.Ideas,
        LearningCourses:   ns.LearningCourses,
        CourseAssignments: ns.CourseAssignments,
      }
      const Entity = ENTITY_MAP[entityName]
      if (!Entity) return req.reject(400, `Unknown entity: ${entityName}`)

      let success = 0, failed = 0
      const errors = []
      for (let i = 0; i < records.length; i++) {
        try {
          const record = { ID: cds.utils.uuid(), ...records[i] }
          await INSERT.into(Entity).entries(record)
          success++
        } catch (e) {
          failed++
          errors.push({ row: i + 1, message: e.message })
        }
      }
      LOG.info(`bulkUpload(${entityName}): ${success} inserted, ${failed} failed`)
      return { success, failed, errors }
    })

    // ── getTeamHeatmap ────────────────────────────────────────────────────
    this.on('getTeamHeatmap', async req => {
      const { practiceLeadID } = req.data
      if (!practiceLeadID) return req.reject(400, 'practiceLeadID is required')
      return await getTeamHeatmap(practiceLeadID)
    })

    // ── getPeerComparison ─────────────────────────────────────────────────
    this.on('getPeerComparison', async req => {
      const { consultantID } = req.data
      if (!consultantID) return req.reject(400, 'consultantID is required')
      return await getPeerComparison(consultantID)
    })

    // ── getNonAdopterList ─────────────────────────────────────────────────
    this.on('getNonAdopterList', async req => {
      const { daysInactive } = req.data
      return await getNonAdopterList(daysInactive ?? 30)
    })

    // ── getCoEStats ───────────────────────────────────────────────────────
    this.on('getCoEStats', async req => {
      return await getCoEStats()
    })

    // ── Mark notification as read on UPDATE ───────────────────────────────
    this.before('UPDATE', 'Notifications', req => {
      if (req.data.isRead === undefined) return
      LOG.debug('Notification marked as read:', req.data.ID)
    })

    // ── Scheduled Jobs ────────────────────────────────────────────────────
    // Skip scheduling during test runs (timers prevent clean process exit)
    if (process.env.NODE_ENV === 'test' || cds.env.profiles?.includes?.('test')) return await super.init()

    cds.on('served', () => {
      // Normalise seed data dates relative to today, then classify
      normaliseSeedDates()
        .then(() => runClassification())
        .catch(e => LOG.error('Startup normalisation/classification failed', e))
      scheduleDaily(1, 0, 'Daily ingestion', async () => {
        await ingestBTPAuditLog().catch(e => LOG.error('BTP ingestion failed', e))
        await ingestAICore().catch(e => LOG.error('AI Core ingestion failed', e))
        await runClassification().catch(e => LOG.error('Classification failed', e))
      })

      scheduleWeeklyMonday(8, 0, 'Weekly digest', async () => {
        await runWeeklyDigest().catch(e => LOG.error('Weekly digest failed', e))
      })

      scheduleMonthlyFirst(7, 0, 'Monthly CoE report', async () => {
        await runMonthlyReport().catch(e => LOG.error('Monthly report failed', e))
      })

      scheduleDaily(9, 0, 'Nudge notifications', async () => {
        await runNudgeNotifications().catch(e => LOG.error('Nudge notifications failed', e))
      })
    })

    await super.init()
  }
}
