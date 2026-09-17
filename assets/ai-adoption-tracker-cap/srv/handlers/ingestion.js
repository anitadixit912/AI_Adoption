import cds from '@sap/cds'
import { calcEstimatedHours } from './classification.js'

const LOG = cds.log('ingestion')

/**
 * Stub: Simulates ingestion from SAP BTP Audit Log for JWD and JS.
 * TODO: Replace with real SAP BTP Audit Log API call when credentials are available.
 * Real endpoint: GET /auditlog/v2/auditlogrecords?$filter=...
 */
export async function ingestBTPAuditLog() {
  const { UsageSessions, Consultants, AITools } = cds.entities('adoption')

  const jwdTool = await SELECT.one.from(AITools).where({ name: 'JWD' })
  const jsTool  = await SELECT.one.from(AITools).where({ name: 'JS' })
  if (!jwdTool || !jsTool) return

  const consultants = await SELECT.from(Consultants)
    .columns('ID', 'role')
    .where({ role: { 'in': ['Consultant', 'PracticeLead', 'Admin'] } })

  const today = new Date().toISOString().split('T')[0]
  let inserted = 0

  for (const consultant of consultants) {
    // Simulate: ~60% chance of a JWD session today
    if (Math.random() < 0.6) {
      const duration = [15, 30, 45, 60, 90][Math.floor(Math.random() * 5)]
      await INSERT.into(UsageSessions).entries({
        ID:                  cds.utils.uuid(),
        consultant_ID:       consultant.ID,
        tool_ID:             jwdTool.ID,
        sessionDate:         today,
        durationMinutes:     duration,
        estimatedHoursSaved: calcEstimatedHours(duration, 'JWD'),
        source:              'Automatic',
        taskType:            ['DocumentDrafting', 'Research', 'Other'][Math.floor(Math.random() * 3)]
      })
      inserted++
    }

    // Simulate: ~40% chance of a JS session today
    if (Math.random() < 0.4) {
      const duration = [15, 30, 45, 60][Math.floor(Math.random() * 4)]
      await INSERT.into(UsageSessions).entries({
        ID:                  cds.utils.uuid(),
        consultant_ID:       consultant.ID,
        tool_ID:             jsTool.ID,
        sessionDate:         today,
        durationMinutes:     duration,
        estimatedHoursSaved: calcEstimatedHours(duration, 'JS'),
        source:              'Automatic',
        taskType:            ['CodeReview', 'DocumentDrafting'][Math.floor(Math.random() * 2)]
      })
      inserted++
    }
  }

  LOG.info(`M1.achieved: BTP Audit Log ingestion stub ran — ${inserted} sessions created`)
  return inserted
}

/**
 * Stub: Simulates ingestion from SAP AI Core for J4C and J4D.
 * TODO: Replace with real SAP AI Core API call when credentials are available.
 * Real endpoint: GET /v2/lm/deployments + consumption metrics per user
 */
export async function ingestAICore() {
  const { UsageSessions, Consultants, AITools } = cds.entities('adoption')

  const j4cTool = await SELECT.one.from(AITools).where({ name: 'J4C' })
  const j4dTool = await SELECT.one.from(AITools).where({ name: 'J4D' })
  if (!j4cTool || !j4dTool) return

  const consultants = await SELECT.from(Consultants)
    .columns('ID', 'role')
    .where({ role: { 'in': ['Consultant', 'PracticeLead', 'Admin'] } })

  const today = new Date().toISOString().split('T')[0]
  let inserted = 0

  for (const consultant of consultants) {
    // Simulate: ~50% chance of a J4C session today
    if (Math.random() < 0.5) {
      const duration = [30, 45, 60, 90][Math.floor(Math.random() * 4)]
      await INSERT.into(UsageSessions).entries({
        ID:                  cds.utils.uuid(),
        consultant_ID:       consultant.ID,
        tool_ID:             j4cTool.ID,
        sessionDate:         today,
        durationMinutes:     duration,
        estimatedHoursSaved: calcEstimatedHours(duration, 'J4C'),
        source:              'Automatic',
        taskType:            ['DataAnalysis', 'Research'][Math.floor(Math.random() * 2)]
      })
      inserted++
    }

    // Simulate: ~45% chance of a J4D session today
    if (Math.random() < 0.45) {
      const duration = [30, 60, 90, 120][Math.floor(Math.random() * 4)]
      await INSERT.into(UsageSessions).entries({
        ID:                  cds.utils.uuid(),
        consultant_ID:       consultant.ID,
        tool_ID:             j4dTool.ID,
        sessionDate:         today,
        durationMinutes:     duration,
        estimatedHoursSaved: calcEstimatedHours(duration, 'J4D'),
        source:              'Automatic',
        taskType:            ['CodeReview', 'DataAnalysis'][Math.floor(Math.random() * 2)]
      })
      inserted++
    }
  }

  LOG.info(`M1.achieved: AI Core ingestion stub ran — ${inserted} sessions created`)
  return inserted
}
