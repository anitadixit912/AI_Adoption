import cds from '@sap/cds'
import { getNonAdopterList } from '../handlers/classification.js'

const LOG = cds.log('weekly-digest')

export async function runWeeklyDigest() {
  const { Consultants, Notifications } = cds.entities('adoption')

  const practiceLeads = await SELECT.from(Consultants)
    .columns('ID', 'name', 'businessUnit')
    .where({ role: 'PracticeLead' })

  const today = new Date()
  const weekLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  let created = 0

  for (const lead of practiceLeads) {
    // Get team members in same BU
    const team = await SELECT.from(Consultants)
      .columns('ID', 'adoptionTier')
      .where({ businessUnit: lead.businessUnit, role: 'Consultant' })

    const active     = team.filter(c => c.adoptionTier === 'ActiveAdopter').length
    const occasional = team.filter(c => c.adoptionTier === 'OccasionalUser').length
    const lapsed     = team.filter(c => c.adoptionTier === 'LapsedUser').length
    const nonAdopter = team.filter(c => c.adoptionTier === 'NonAdopter').length

    const inactiveList = await getNonAdopterList(30)
    const teamInactive = inactiveList.filter(c => c.businessUnit === lead.businessUnit)
    const inactiveNames = teamInactive.map(c => c.consultantName).join(', ') || 'None'

    const message =
      `Team summary for ${lead.businessUnit}: ` +
      `${active} active adopters, ${occasional} occasional users, ${lapsed} lapsed users, ${nonAdopter} non-adopters. ` +
      `Consultants inactive 30+ days: ${inactiveNames}.`

    await INSERT.into(Notifications).entries({
      ID:           cds.utils.uuid(),
      consultant_ID: lead.ID,
      type:         'WeeklyDigest',
      title:        `Weekly AI Adoption Digest — Week of ${weekLabel}`,
      message,
      isRead:       false
    })
    created++
  }

  LOG.info(`M5.achieved: weekly digest created — ${created} notifications sent to practice leads`)
  return `Weekly digest sent to ${created} practice leads.`
}
