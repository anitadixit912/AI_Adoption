import cds from '@sap/cds'
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

const { expect } = cds.test(import.meta.dirname + '/..')

let srv, Consultants, UsageSessions, AITools

describe('Adoption Classification Tests', () => {
  before(async () => {
    srv          = await cds.connect.to('AdoptionService')
    Consultants  = cds.entities('adoption').Consultants
    UsageSessions = cds.entities('adoption').UsageSessions
    AITools      = cds.entities('adoption').AITools
  })

  // ── Helper: create a consultant and optional sessions ──────────────────
  async function createConsultant(lastSessionDaysAgo) {
    const id = cds.utils.uuid()
    await INSERT.into(Consultants).entries({
      ID:           id,
      name:         `Test Consultant ${id.slice(0,6)}`,
      email:        `test${id.slice(0,6)}@test.com`,
      role:         'Consultant',
      businessUnit: 'TEST-BU',
      department:   'Testing',
      adoptionTier: 'NonAdopter'
    })

    if (lastSessionDaysAgo !== null) {
      const tool = await SELECT.one.from(AITools)
      const sessionDate = new Date()
      sessionDate.setDate(sessionDate.getDate() - lastSessionDaysAgo)
      await INSERT.into(UsageSessions).entries({
        ID:                  cds.utils.uuid(),
        consultant_ID:       id,
        tool_ID:             tool.ID,
        sessionDate:         sessionDate.toISOString().split('T')[0],
        durationMinutes:     30,
        estimatedHoursSaved: 0.30,
        source:              'Manual'
      })
    }
    return id
  }

  // ── runClassification ──────────────────────────────────────────────────

  it('classifies consultant with session in last 30 days as ActiveAdopter', async () => {
    const id = await createConsultant(10) // 10 days ago
    await srv.send('runClassification', {})
    const [c] = await SELECT.from(Consultants).where({ ID: id })
    assert.strictEqual(c.adoptionTier, 'ActiveAdopter')
  })

  it('classifies consultant with session 45 days ago as OccasionalUser', async () => {
    const id = await createConsultant(45)
    await srv.send('runClassification', {})
    const [c] = await SELECT.from(Consultants).where({ ID: id })
    assert.strictEqual(c.adoptionTier, 'OccasionalUser')
  })

  it('classifies consultant with session 75 days ago as LapsedUser', async () => {
    const id = await createConsultant(75)
    await srv.send('runClassification', {})
    const [c] = await SELECT.from(Consultants).where({ ID: id })
    assert.strictEqual(c.adoptionTier, 'LapsedUser')
  })

  it('classifies consultant with no sessions as NonAdopter', async () => {
    const id = await createConsultant(null)
    await srv.send('runClassification', {})
    const [c] = await SELECT.from(Consultants).where({ ID: id })
    assert.strictEqual(c.adoptionTier, 'NonAdopter')
  })

  it('classifies consultant with session older than 90 days as NonAdopter', async () => {
    const id = await createConsultant(95)
    await srv.send('runClassification', {})
    const [c] = await SELECT.from(Consultants).where({ ID: id })
    assert.strictEqual(c.adoptionTier, 'NonAdopter')
  })

  // ── getNonAdopterList ──────────────────────────────────────────────────

  it('getNonAdopterList returns consultant inactive for exactly 30 days', async () => {
    const id = await createConsultant(30)
    const result = await srv.send('getNonAdopterList', { daysInactive: 30 })
    const found = result.find(c => c.consultantID === id)
    assert.ok(found, 'Consultant inactive 30 days should be in the list')
    assert.ok(found.daysInactive >= 30, 'daysInactive should be >= 30')
  })

  it('getNonAdopterList excludes consultant active within last 30 days', async () => {
    const id = await createConsultant(5) // active 5 days ago
    // Run classification first so lastActivityDate is populated
    await srv.send('runClassification', {})
    const result = await srv.send('getNonAdopterList', { daysInactive: 30 })
    const found = result.find(c => c.consultantID === id)
    assert.ok(!found, 'Active consultant should NOT appear in non-adopter list')
  })
})

describe('Efficiency Metrics Tests', () => {
  before(async () => {
    srv           = await cds.connect.to('AdoptionService')
    UsageSessions = cds.entities('adoption').UsageSessions
    AITools       = cds.entities('adoption').AITools
  })

  it('logManualSession calculates estimatedHoursSaved correctly for JWD (factor 0.60)', async () => {
    const tool = await SELECT.one.from(AITools).where({ name: 'JWD' })
    const result = await srv.send('logManualSession', {
      toolID:          tool.ID,
      taskType:        'Research',
      sessionDate:     new Date().toISOString().split('T')[0],
      durationMinutes: 60
    })
    // 60 min / 60 * 0.60 = 0.60 hours
    assert.strictEqual(Number(result.estimatedHoursSaved), 0.60)
  })

  it('logManualSession calculates estimatedHoursSaved correctly for J4D (factor 0.70)', async () => {
    const tool = await SELECT.one.from(AITools).where({ name: 'J4D' })
    const result = await srv.send('logManualSession', {
      toolID:          tool.ID,
      taskType:        'CodeReview',
      sessionDate:     new Date().toISOString().split('T')[0],
      durationMinutes: 60
    })
    // 60 min / 60 * 0.70 = 0.70 hours
    assert.strictEqual(Number(result.estimatedHoursSaved), 0.70)
  })

  it('adjustHoursSaved updates consultantAdjustedHours on session', async () => {
    const tool = await SELECT.one.from(AITools).where({ name: 'EKX' })
    // Create a session
    const session = await srv.send('logManualSession', {
      toolID:          tool.ID,
      taskType:        'Other',
      sessionDate:     new Date().toISOString().split('T')[0],
      durationMinutes: 30
    })
    // Adjust the hours
    const updated = await srv.send('adjustHoursSaved', {
      sessionID:    session.ID,
      adjustedHours: 0.75
    })
    assert.strictEqual(Number(updated.consultantAdjustedHours), 0.75)
  })

  it('adjustHoursSaved rejects negative hours', async () => {
    await assert.rejects(
      () => srv.send('adjustHoursSaved', { sessionID: cds.utils.uuid(), adjustedHours: -1 }),
      err => /adjustedHours must be >= 0/i.test(err.message)
    )
  })
})

describe('Peer Comparison Tests', () => {
  before(async () => {
    srv          = await cds.connect.to('AdoptionService')
    Consultants  = cds.entities('adoption').Consultants
    UsageSessions = cds.entities('adoption').UsageSessions
    AITools      = cds.entities('adoption').AITools
  })

  it('getPeerComparison returns anonymized result with no consultant names', async () => {
    const result = await srv.send('getPeerComparison', {
      consultantID: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu'
    })
    assert.ok(result, 'Result should not be null')
    assert.ok(typeof result.percentileRank === 'number', 'percentileRank should be a number')
    assert.ok(typeof result.avgSessionsInBU === 'number', 'avgSessionsInBU should be a number')
    assert.ok(Array.isArray(result.toolsNotUsed), 'toolsNotUsed should be an array')
    // Ensure no consultant name fields are exposed
    assert.ok(!result.consultantName, 'Result should not expose consultantName')
    assert.ok(!result.email, 'Result should not expose email')
  })

  it('getPeerComparison percentileRank is between 0 and 100', async () => {
    const result = await srv.send('getPeerComparison', {
      consultantID: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu'
    })
    assert.ok(result.percentileRank >= 0 && result.percentileRank <= 100,
      `percentileRank ${result.percentileRank} should be between 0 and 100`)
  })
})
