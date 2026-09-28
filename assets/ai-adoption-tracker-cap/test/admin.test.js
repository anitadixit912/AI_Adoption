import cds from '@sap/cds'
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

const { expect } = cds.test(import.meta.dirname + '/..')

let srv, Ideas, LearningCourses, CourseAssignments, Consultants, AITools

describe('Admin — bulkUpload Tests', () => {
  before(async () => {
    srv               = await cds.connect.to('AdoptionService')
    Ideas             = cds.entities('adoption').Ideas
    LearningCourses   = cds.entities('adoption').LearningCourses
    CourseAssignments = cds.entities('adoption').CourseAssignments
    Consultants       = cds.entities('adoption').Consultants
    AITools           = cds.entities('adoption').AITools
  })

  // ── bulkUpload — Ideas ────────────────────────────────────────────────────

  it('bulkUpload inserts valid Ideas records', async () => {
    const submitter = await SELECT.one.from(Consultants).columns('ID')
    const records = [
      { title: 'Bulk Idea A', description: 'Test idea A', submitter_ID: submitter.ID, status: 'Submitted' },
      { title: 'Bulk Idea B', description: 'Test idea B', submitter_ID: submitter.ID, status: 'Approved'  },
    ]
    const result = await srv.send('bulkUpload', { entityName: 'Ideas', records: JSON.stringify(records) })
    assert.strictEqual(result.success, 2, 'Should insert 2 records')
    assert.strictEqual(result.failed,  0, 'Should have 0 failures')
    assert.deepStrictEqual(result.errors, [], 'Errors array should be empty')
  })

  it('bulkUpload reports failure for Ideas with missing required title', async () => {
    const submitter = await SELECT.one.from(Consultants).columns('ID')
    const records = [
      { description: 'Missing title', submitter_ID: submitter.ID, status: 'Submitted' },
    ]
    const result = await srv.send('bulkUpload', { entityName: 'Ideas', records: JSON.stringify(records) })
    assert.strictEqual(result.failed, 1, 'Should report 1 failure for missing required field')
    assert.ok(result.errors.length > 0, 'errors array should have an entry')
    assert.strictEqual(result.errors[0].row, 1, 'error row should be 1')
  })

  // ── bulkUpload — Users ────────────────────────────────────────────────────

  it('bulkUpload inserts valid Users records', async () => {
    const records = [
      { name: 'Bulk User X', email: 'bulkx@test.com', role: 'Consultant', businessUnit: 'TEST-BU', department: 'Testing' },
      { name: 'Bulk User Y', email: 'bulky@test.com', role: 'Consultant', businessUnit: 'TEST-BU', department: 'Testing' },
    ]
    const result = await srv.send('bulkUpload', { entityName: 'Users', records: JSON.stringify(records) })
    assert.strictEqual(result.success, 2, 'Should insert 2 user records')
    assert.strictEqual(result.failed,  0, 'Should have 0 failures')
  })

  // ── bulkUpload — LearningCourses ──────────────────────────────────────────

  it('bulkUpload inserts valid LearningCourses records', async () => {
    const tool = await SELECT.one.from(AITools).columns('ID')
    const records = [
      { name: 'Bulk Course Alpha', description: 'Intro course', relatedTool_ID: tool.ID, durationHours: 2 },
      { name: 'Bulk Course Beta',  description: 'Advanced course', durationHours: 4 },
    ]
    const result = await srv.send('bulkUpload', { entityName: 'LearningCourses', records: JSON.stringify(records) })
    assert.strictEqual(result.success, 2, 'Should insert 2 course records')
    assert.strictEqual(result.failed,  0, 'Should have 0 failures')
  })

  // ── bulkUpload — unknown entity ───────────────────────────────────────────

  it('bulkUpload rejects unknown entityName', async () => {
    await assert.rejects(
      () => srv.send('bulkUpload', { entityName: 'NonExistentEntity', records: JSON.stringify([{ foo: 'bar' }]) }),
      err => /unknown entity/i.test(err.message)
    )
  })

  // ── bulkUpload — empty records ────────────────────────────────────────────

  it('bulkUpload rejects empty records array', async () => {
    await assert.rejects(
      () => srv.send('bulkUpload', { entityName: 'Ideas', records: JSON.stringify([]) }),
      err => /records must be a non-empty array/i.test(err.message)
    )
  })
})

describe('Admin — Ideas CRUD Tests', () => {
  before(async () => {
    srv        = await cds.connect.to('AdoptionService')
    Ideas      = cds.entities('adoption').Ideas
    Consultants = cds.entities('adoption').Consultants
  })

  it('can POST and GET an Idea directly via service entities', async () => {
    const submitter = await SELECT.one.from(Consultants).columns('ID')
    const id = cds.utils.uuid()
    await INSERT.into(Ideas).entries({
      ID:          id,
      title:       'Direct Insert Idea',
      description: 'Inserted directly via service test',
      submitter_ID: submitter.ID,
      status:      'Submitted'
    })
    const [found] = await SELECT.from(Ideas).where({ ID: id })
    assert.ok(found, 'Inserted idea should be retrievable')
    assert.strictEqual(found.title, 'Direct Insert Idea')
    assert.strictEqual(found.status, 'Submitted')
  })

  it('seed data contains Ideas records', async () => {
    const rows = await SELECT.from(Ideas)
    assert.ok(rows.length >= 5, `Should have at least 5 seed ideas, got ${rows.length}`)
  })
})

describe('Admin — LearningCourses Tests', () => {
  before(async () => {
    srv             = await cds.connect.to('AdoptionService')
    LearningCourses = cds.entities('adoption').LearningCourses
    CourseAssignments = cds.entities('adoption').CourseAssignments
    Consultants     = cds.entities('adoption').Consultants
    AITools         = cds.entities('adoption').AITools
  })

  it('seed data contains LearningCourses records', async () => {
    const rows = await SELECT.from(LearningCourses)
    assert.ok(rows.length >= 5, `Should have at least 5 seed courses, got ${rows.length}`)
  })

  it('seed data contains CourseAssignments records', async () => {
    const rows = await SELECT.from(CourseAssignments)
    assert.ok(rows.length >= 5, `Should have at least 5 seed assignments, got ${rows.length}`)
  })

  it('can create a LearningCourse with a CourseAssignment', async () => {
    const tool       = await SELECT.one.from(AITools).columns('ID')
    const consultant = await SELECT.one.from(Consultants).columns('ID').where({ role: 'Consultant' })

    const courseID = cds.utils.uuid()
    await INSERT.into(LearningCourses).entries({
      ID:           courseID,
      name:         'Test Course for Assignment',
      durationHours: 1.5,
      relatedTool_ID: tool.ID
    })

    const assignID = cds.utils.uuid()
    await INSERT.into(CourseAssignments).entries({
      ID:              assignID,
      course_ID:       courseID,
      consultant_ID:   consultant.ID,
      completionStatus: 'Assigned'
    })

    const [assignment] = await SELECT.from(CourseAssignments).where({ ID: assignID })
    assert.ok(assignment, 'Assignment should exist')
    assert.strictEqual(assignment.course_ID, courseID)
    assert.strictEqual(assignment.completionStatus, 'Assigned')
  })

  it('CourseAssignment completionStatus can be updated to Completed', async () => {
    const consultant = await SELECT.one.from(Consultants).columns('ID').where({ role: 'Consultant' })
    const courseID   = cds.utils.uuid()
    await INSERT.into(LearningCourses).entries({
      ID: courseID, name: 'Completion Test Course', durationHours: 2
    })
    const assignID = cds.utils.uuid()
    await INSERT.into(CourseAssignments).entries({
      ID: assignID, course_ID: courseID, consultant_ID: consultant.ID, completionStatus: 'InProgress'
    })

    await UPDATE(CourseAssignments, assignID).with({ completionStatus: 'Completed', completionDate: '2026-09-01' })
    const [updated] = await SELECT.from(CourseAssignments).where({ ID: assignID })
    assert.strictEqual(updated.completionStatus, 'Completed')
    assert.strictEqual(updated.completionDate, '2026-09-01')
  })
})
