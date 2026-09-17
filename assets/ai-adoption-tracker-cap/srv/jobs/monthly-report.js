import cds from '@sap/cds'
import { getCoEStats } from '../handlers/classification.js'

const LOG = cds.log('monthly-report')

export async function runMonthlyReport() {
  const { Consultants, Notifications } = cds.entities('adoption')

  const coeLeaders = await SELECT.from(Consultants)
    .columns('ID', 'name')
    .where({ role: 'CoELeadership' })

  const stats = await getCoEStats()
  const today = new Date()
  const monthLabel = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  let created = 0

  const toolBreakdownText = stats.toolBreakdown
    .map(t => `${t.toolName}: ${t.sessionCount} sessions`)
    .join(', ')

  const message =
    `Overall adoption rate: ${stats.adoptionPct}%. ` +
    `Tier breakdown: ${stats.activeAdopters} Active Adopters, ${stats.occasionalUsers} Occasional Users, ` +
    `${stats.lapsedUsers} Lapsed Users, ${stats.nonAdopters} Non-Adopters. ` +
    `Total hours saved: ${stats.totalHoursSaved} hours. ` +
    `Top tool: ${stats.topTool}. ` +
    `Tool breakdown: ${toolBreakdownText}. ` +
    `AI Adoption Health Score: ${stats.healthScore}/100.`

  for (const leader of coeLeaders) {
    await INSERT.into(Notifications).entries({
      ID:            cds.utils.uuid(),
      consultant_ID: leader.ID,
      type:          'MonthlyReport',
      title:         `Monthly AI Adoption CoE Summary — ${monthLabel}`,
      message,
      isRead:        false
    })
    created++
  }

  LOG.info(`M5.achieved: monthly CoE report created — ${created} notifications sent to CoE leaders`)
  return `Monthly CoE report sent to ${created} leaders.`
}
