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
      const { toolID, taskType, sessionDate, durationMinutes } = req.data
      if (!toolID || !durationMinutes || durationMinutes <= 0)
        return req.reject(400, 'toolID and durationMinutes are required and durationMinutes must be > 0')

      const { AITools } = cds.entities('adoption')
      const tool = await SELECT.one.from(AITools).where({ ID: toolID })
      if (!tool) return req.reject(404, 'Tool not found')

      const estimatedHoursSaved = calcEstimatedHours(durationMinutes, tool.name)
      const session = {
        ID:                  cds.utils.uuid(),
        consultant_ID:       req.user.id ?? 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tool_ID:             toolID,
        sessionDate:         sessionDate ?? new Date().toISOString().split('T')[0],
        durationMinutes,
        estimatedHoursSaved,
        source:              'Manual',
        taskType:            taskType ?? 'Other'
      }
      await INSERT.into(UsageSessions).entries(session)
      return session
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
