import cds from '@sap/cds'
import { getNonAdopterList } from '../handlers/classification.js'

const LOG = cds.log('nudge-notifications')

export async function runNudgeNotifications() {
  const { Notifications, UsageSessions, AITools } = cds.entities('adoption')

  const inactiveConsultants = await getNonAdopterList(30)
  const today = new Date()
  const sevenDaysAgo = new Date(today - 7 * 24 * 60 * 60 * 1000).toISOString()
  const cutoff30 = new Date(today - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const tools = await SELECT.from(AITools).columns('ID', 'name')
  let created = 0

  for (const consultant of inactiveConsultants) {
    // Anti-spam: skip if nudge was sent in last 7 days
    const recentNudge = await SELECT.one.from(Notifications)
      .where({
        consultant_ID: consultant.consultantID,
        type:          'Nudge',
        createdAt:     { '>=': sevenDaysAgo }
      })

    if (recentNudge) continue

    // Find tools not used in last 30 days
    const usedSessions = await SELECT.from(UsageSessions)
      .columns('tool_ID')
      .where({ consultant_ID: consultant.consultantID, sessionDate: { '>=': cutoff30 } })

    const usedToolIDs = new Set(usedSessions.map(s => s.tool_ID))
    const unusedTools = tools.filter(t => !usedToolIDs.has(t.ID)).map(t => t.name)

    const daysText = consultant.daysInactive >= 999 ? 'never started' : `${consultant.daysInactive} days`
    const toolText = unusedTools.length > 0
      ? `Tools to try: ${unusedTools.join(', ')}.`
      : 'Try using your AI tools more regularly to boost your adoption score.'

    const message =
      `Hi ${consultant.consultantName}, it's been ${daysText} since your last AI tool session. ` +
      `${toolText} ` +
      `Your team is saving an average of 3+ hours per week with AI tools!`

    await INSERT.into(Notifications).entries({
      ID:            cds.utils.uuid(),
      consultant_ID: consultant.consultantID,
      type:          'Nudge',
      title:         "You haven't used AI tools recently",
      message,
      isRead:        false
    })
    created++
  }

  LOG.info(`M4.achieved: nudge notifications sent — ${created} nudges created (${inactiveConsultants.length - created} skipped due to anti-spam)`)
  return `${created} nudge notifications created.`
}
