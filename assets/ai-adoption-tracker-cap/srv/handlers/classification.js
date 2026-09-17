import cds from '@sap/cds'

const LOG = cds.log('classification')

// Tool efficiency factors for hours saved calculation
const TOOL_EFFICIENCY = {
  JWD: 0.60,
  JS:  0.65,
  J4C: 0.70,
  J4D: 0.70,
  EKX: 0.60
}

/**
 * Classify all consultants into adoption tiers based on session history.
 * Tiers:
 *   ActiveAdopter  — session in last 30 days
 *   OccasionalUser — last session 31–60 days ago
 *   LapsedUser     — last session 61–90 days ago
 *   NonAdopter     — no session ever, or last session > 90 days ago
 */
export async function runClassification() {
  const { Consultants, UsageSessions } = cds.entities('adoption')
  const today = new Date()

  // Fetch all consultants
  const consultants = await SELECT.from(Consultants).columns('ID', 'name', 'adoptionTier', 'lastActivityDate')

  let updated = 0

  for (const consultant of consultants) {
    // Get the most recent session date for this consultant
    const [latest] = await SELECT
      .from(UsageSessions)
      .columns('sessionDate')
      .where({ consultant_ID: consultant.ID })
      .orderBy({ sessionDate: 'desc' })
      .limit(1)

    let newTier = 'NonAdopter'
    let lastActivityDate = null

    if (latest?.sessionDate) {
      const sessionDate = new Date(latest.sessionDate)
      const diffDays = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24))
      lastActivityDate = latest.sessionDate

      if (diffDays <= 30) {
        newTier = 'ActiveAdopter'
      } else if (diffDays <= 60) {
        newTier = 'OccasionalUser'
      } else if (diffDays <= 90) {
        newTier = 'LapsedUser'
      } else {
        newTier = 'NonAdopter'
      }
    }

    if (consultant.adoptionTier !== newTier || consultant.lastActivityDate !== lastActivityDate) {
      await UPDATE(Consultants, consultant.ID).with({ adoptionTier: newTier, lastActivityDate })
      updated++
    }
  }

  LOG.info(`M2.achieved: adoption classification active — ${updated} consultants updated out of ${consultants.length}`)
  return `Classification complete. ${updated} of ${consultants.length} consultants updated.`
}

/**
 * Get list of consultants inactive for at least N days.
 */
export async function getNonAdopterList(daysInactive) {
  const { Consultants } = cds.entities('adoption')
  const today = new Date()
  const cutoff = new Date(today - daysInactive * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const consultants = await SELECT
    .from(Consultants)
    .columns('ID', 'name', 'email', 'businessUnit', 'adoptionTier', 'lastActivityDate')
    .where({ lastActivityDate: null })
    .or({ lastActivityDate: { '<=': cutoff } })
    .orderBy({ lastActivityDate: 'asc' })

  return consultants.map(c => {
    const diffDays = c.lastActivityDate
      ? Math.floor((today - new Date(c.lastActivityDate)) / (1000 * 60 * 60 * 24))
      : 999
    return {
      consultantID:     c.ID,
      consultantName:   c.name,
      email:            c.email,
      businessUnit:     c.businessUnit,
      adoptionTier:     c.adoptionTier,
      daysInactive:     diffDays,
      lastActivityDate: c.lastActivityDate
    }
  })
}

/**
 * Calculate estimated hours saved for a session.
 */
export function calcEstimatedHours(durationMinutes, toolName) {
  const factor = TOOL_EFFICIENCY[toolName] ?? 0.60
  return parseFloat(((durationMinutes / 60) * factor).toFixed(2))
}

/**
 * Get team heatmap: consultant × tool session counts.
 */
export async function getTeamHeatmap(practiceLeadID) {
  const { Consultants, UsageSessions, AITools } = cds.entities('adoption')

  // Get practice lead's BU
  const [lead] = await SELECT.from(Consultants).columns('businessUnit').where({ ID: practiceLeadID })
  const bu = lead?.businessUnit

  // Get all consultants in same BU (excluding the lead)
  const consultants = await SELECT
    .from(Consultants)
    .columns('ID', 'name', 'adoptionTier')
    .where({ businessUnit: bu, role: { '!=': 'CoELeadership' } })
    .orderBy({ name: 'asc' })

  const tools = await SELECT.from(AITools).columns('ID', 'name').orderBy({ name: 'asc' })

  const today = new Date()
  const cutoff30 = new Date(today - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const result = []
  for (const consultant of consultants) {
    const toolUsage = []
    for (const tool of tools) {
      const sessions = await SELECT
        .from(UsageSessions)
        .columns('ID')
        .where({ consultant_ID: consultant.ID, tool_ID: tool.ID, sessionDate: { '>=': cutoff30 } })

      const count = sessions.length
      const intensity = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3

      toolUsage.push({
        toolID:       tool.ID,
        toolName:     tool.name,
        sessionCount: count,
        intensity
      })
    }
    result.push({
      consultantID:   consultant.ID,
      consultantName: consultant.name,
      adoptionTier:   consultant.adoptionTier,
      toolUsage
    })
  }
  return result
}

/**
 * Get anonymized peer comparison for a consultant within same BU.
 */
export async function getPeerComparison(consultantID) {
  const { Consultants, UsageSessions, AITools } = cds.entities('adoption')

  const [consultant] = await SELECT.from(Consultants).columns('ID', 'businessUnit').where({ ID: consultantID })
  if (!consultant) return null

  const today = new Date()
  const cutoff30 = new Date(today - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get all consultants in same BU
  const peers = await SELECT
    .from(Consultants)
    .columns('ID')
    .where({ businessUnit: consultant.businessUnit, role: 'Consultant' })

  // Count sessions per peer in last 30 days
  const sessionCounts = await Promise.all(peers.map(async p => {
    const sessions = await SELECT
      .from(UsageSessions)
      .columns('ID')
      .where({ consultant_ID: p.ID, sessionDate: { '>=': cutoff30 } })
    return { id: p.ID, count: sessions.length }
  }))

  const mySessions = sessionCounts.find(s => s.id === consultantID)?.count ?? 0
  const allCounts = sessionCounts.map(s => s.count).sort((a, b) => a - b)
  const avgSessions = allCounts.length > 0
    ? parseFloat((allCounts.reduce((a, b) => a + b, 0) / allCounts.length).toFixed(1))
    : 0

  const rank = allCounts.filter(c => c < mySessions).length
  const percentileRank = allCounts.length > 1
    ? Math.round((rank / (allCounts.length - 1)) * 100)
    : 100

  // Find tools not used in last 30 days
  const tools = await SELECT.from(AITools).columns('ID', 'name')
  const usedTools = await SELECT
    .from(UsageSessions)
    .columns('tool_ID')
    .where({ consultant_ID: consultantID, sessionDate: { '>=': cutoff30 } })

  const usedToolIDs = new Set(usedTools.map(s => s.tool_ID))
  const toolsNotUsed = tools.filter(t => !usedToolIDs.has(t.ID)).map(t => t.name)

  return { percentileRank, avgSessionsInBU: avgSessions, mySessionCount: mySessions, toolsNotUsed }
}

/**
 * Get aggregated CoE stats across all consultants.
 */
export async function getCoEStats() {
  const { Consultants, UsageSessions, AITools } = cds.entities('adoption')

  const consultants = await SELECT.from(Consultants).columns('ID', 'adoptionTier')
    .where({ role: { 'in': ['Consultant', 'PracticeLead'] } })

  const total = consultants.length
  const activeAdopters   = consultants.filter(c => c.adoptionTier === 'ActiveAdopter').length
  const occasionalUsers  = consultants.filter(c => c.adoptionTier === 'OccasionalUser').length
  const lapsedUsers      = consultants.filter(c => c.adoptionTier === 'LapsedUser').length
  const nonAdopters      = consultants.filter(c => c.adoptionTier === 'NonAdopter').length
  const adoptionPct      = total > 0 ? parseFloat(((activeAdopters + occasionalUsers) / total * 100).toFixed(1)) : 0

  // Total hours saved
  const sessions = await SELECT.from(UsageSessions).columns('estimatedHoursSaved', 'consultantAdjustedHours')
  const totalHoursSaved = parseFloat(sessions
    .reduce((sum, s) => sum + (s.consultantAdjustedHours ?? s.estimatedHoursSaved ?? 0), 0)
    .toFixed(2))

  // Health score: 40% adoption rate + 30% active adopter % + 30% hours saved score (capped at 100)
  const activeAdopterPct = total > 0 ? (activeAdopters / total) * 100 : 0
  const hoursSavedScore  = Math.min((totalHoursSaved / (total * 10)) * 100, 100)
  const healthScore      = Math.round(0.4 * adoptionPct + 0.3 * activeAdopterPct + 0.3 * hoursSavedScore)

  // Per-tool breakdown
  const tools = await SELECT.from(AITools).columns('ID', 'name')
  const toolBreakdown = await Promise.all(tools.map(async t => {
    const toolSessions = await SELECT.from(UsageSessions).columns('ID', 'consultant_ID').where({ tool_ID: t.ID })
    const uniqueUsers  = new Set(toolSessions.map(s => s.consultant_ID)).size
    return { toolName: t.name, sessionCount: toolSessions.length, userCount: uniqueUsers }
  }))
  toolBreakdown.sort((a, b) => b.sessionCount - a.sessionCount)

  const topTool = toolBreakdown[0]?.toolName ?? 'N/A'

  return { totalConsultants: total, activeAdopters, occasionalUsers, lapsedUsers, nonAdopters, adoptionPct, totalHoursSaved, healthScore, topTool, toolBreakdown }
}
