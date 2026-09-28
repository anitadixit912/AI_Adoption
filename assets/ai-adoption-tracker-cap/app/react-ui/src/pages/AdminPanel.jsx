import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { apiGet, apiPost } from '../hooks/useApi.js'

// ── Column definitions per entity ────────────────────────────────────────────

const ENTITY_CONFIG = {
  Users: {
    label: 'Users',
    icon: '👤',
    endpoint: '/Consultants',
    bulkName: 'Users',
    templateHeaders: ['name', 'email', 'role', 'businessUnit', 'department'],
    columns: [
      { key: 'name',         label: 'Name'          },
      { key: 'email',        label: 'Email'         },
      { key: 'role',         label: 'Role'          },
      { key: 'businessUnit', label: 'Business Unit' },
      { key: 'department',   label: 'Department'    },
      { key: 'adoptionTier', label: 'Tier'          },
    ],
  },
  Sessions: {
    label: 'Sessions',
    icon: '📋',
    endpoint: '/UsageSessions?$expand=consultant,tool&$orderby=sessionDate desc&$top=100',
    bulkName: 'Sessions',
    templateHeaders: ['consultant_ID', 'tool_ID', 'sessionDate', 'durationMinutes', 'taskType', 'source'],
    columns: [
      { key: 'sessionDate',       label: 'Date'       },
      { key: 'consultant/name',   label: 'Consultant' },
      { key: 'tool/name',         label: 'Tool'       },
      { key: 'durationMinutes',   label: 'Duration (min)' },
      { key: 'taskType',          label: 'Task Type'  },
      { key: 'source',            label: 'Source'     },
    ],
  },
  Ideas: {
    label: 'Ideas',
    icon: '💡',
    endpoint: '/Ideas?$expand=submitter&$orderby=createdAt desc',
    bulkName: 'Ideas',
    templateHeaders: ['title', 'description', 'submitter_ID', 'status'],
    columns: [
      { key: 'title',           label: 'Title'     },
      { key: 'submitter/name',  label: 'Submitter' },
      { key: 'status',          label: 'Status'    },
      { key: 'description',     label: 'Description' },
    ],
  },
  LearningCourses: {
    label: 'Learning Courses',
    icon: '🎓',
    endpoint: '/LearningCourses?$expand=relatedTool&$orderby=name',
    bulkName: 'LearningCourses',
    templateHeaders: ['name', 'description', 'relatedTool_ID', 'durationHours'],
    columns: [
      { key: 'name',              label: 'Course Name'   },
      { key: 'relatedTool/name',  label: 'Tool'          },
      { key: 'durationHours',     label: 'Duration (hrs)'},
      { key: 'description',       label: 'Description'   },
    ],
  },
}

const TABS = ['Users', 'Sessions', 'Ideas', 'LearningCourses']

// ── Helper: resolve nested key like "consultant/name" ────────────────────────
function getVal(row, key) {
  const parts = key.split('/')
  let v = row
  for (const p of parts) v = v?.[p]
  return v ?? '—'
}

// ── Status badge colour ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  Submitted:    '#0057b8',
  Approved:     '#107e3e',
  Implemented:  '#5a6a85',
  Assigned:     '#e9730c',
  InProgress:   '#0057b8',
  Completed:    '#107e3e',
  Skipped:      '#aaa',
}

function StatusBadge({ value }) {
  const color = STATUS_COLORS[value] ?? '#888'
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}40`,
      borderRadius: 10, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
    }}>{value}</span>
  )
}

// ── Bulk upload zone ──────────────────────────────────────────────────────────
function BulkUploadZone({ config, onSuccess }) {
  const [rows, setRows]           = useState([])
  const [fileName, setFileName]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState(null)
  const inputRef = useRef()

  function parseFile(file) {
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const ab = e.target.result
      const wb = XLSX.read(ab, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' })
      setRows(parsed)
    }
    reader.readAsArrayBuffer(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([config.templateHeaders])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, config.label)
    XLSX.writeFile(wb, `${config.label}_template.xlsx`)
  }

  async function upload() {
    if (!rows.length) return
    setUploading(true)
    setResult(null)
    try {
      const res = await apiPost('/bulkUpload', { entityName: config.bulkName, records: JSON.stringify(rows) })
      setResult(res)
      if (res.success > 0) {
        onSuccess()
        setRows([])
        setFileName('')
      }
    } catch (e) {
      setResult({ success: 0, failed: rows.length, errors: [{ row: 0, message: e.message }] })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ color: '#0a2540', fontSize: '0.9rem', fontWeight: 700 }}>Bulk Upload via Excel / CSV</h4>
        <button className="panel-toggle-btn" onClick={downloadTemplate} title="Download blank template">
          ⬇ Download Template
        </button>
      </div>

      <div
        className="upload-zone"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
      >
        {fileName
          ? <><span style={{ fontSize: '1.1rem' }}>📄</span> <strong>{fileName}</strong> — {rows.length} rows parsed</>
          : <><span style={{ fontSize: '1.4rem' }}>📤</span><br />Drag & drop an Excel (.xlsx) or CSV file here, or <u>click to browse</u><br /><span style={{ fontSize: '0.75rem', color: '#5a6a85' }}>Expected columns: {config.templateHeaders.join(', ')}</span></>
        }
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) parseFile(f); e.target.value = '' }} />

      {rows.length > 0 && (
        <>
          <div className="upload-preview">
            <table>
              <thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
                ))}
                {rows.length > 3 && <tr><td colSpan={Object.keys(rows[0]).length} style={{ color: '#5a6a85', fontStyle: 'italic', textAlign: 'center' }}>…and {rows.length - 3} more rows</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="admin-form-actions">
            <button className="submit-btn" onClick={upload} disabled={uploading}>
              {uploading ? 'Uploading...' : `Upload ${rows.length} row${rows.length !== 1 ? 's' : ''}`}
            </button>
            <button className="panel-toggle-btn" onClick={() => { setRows([]); setFileName(''); setResult(null) }}>
              Clear
            </button>
          </div>
        </>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          {result.success > 0 && (
            <div className="success-banner">
              {result.success} record{result.success !== 1 ? 's' : ''} uploaded successfully
              {result.failed > 0 && ` · ${result.failed} failed`}
            </div>
          )}
          {result.failed > 0 && result.success === 0 && (
            <div className="error-banner">Upload failed — {result.failed} error{result.failed !== 1 ? 's' : ''}</div>
          )}
          {result.errors?.length > 0 && (
            <ul style={{ marginTop: 8, fontSize: '0.8rem', color: '#cc1919', paddingLeft: 18 }}>
              {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add-single-record forms per entity ───────────────────────────────────────

function AddForm({ entityKey, consultants, tools, onSuccess }) {
  const BLANK = {
    Users:           { name: '', email: '', role: 'Consultant', businessUnit: '', department: '' },
    Sessions:        { consultant_ID: '', tool_ID: '', sessionDate: '', durationMinutes: '', taskType: 'Other', source: 'Manual' },
    Ideas:           { title: '', description: '', submitter_ID: '', status: 'Submitted' },
    LearningCourses: { name: '', description: '', relatedTool_ID: '', durationHours: '' },
  }
  const ENDPOINTS = {
    Users:           '/Consultants',
    Sessions:        '/UsageSessions',
    Ideas:           '/Ideas',
    LearningCourses: '/LearningCourses',
  }

  const [form, setForm]       = useState(BLANK[entityKey])
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)
  const [open, setOpen]       = useState(false)

  useEffect(() => { setForm(BLANK[entityKey]); setMsg(null) }, [entityKey])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const payload = { ...form }
      // convert numeric strings
      if (payload.durationMinutes) payload.durationMinutes = Number(payload.durationMinutes)
      if (payload.durationHours)   payload.durationHours   = Number(payload.durationHours)
      await apiPost(ENDPOINTS[entityKey], payload)
      setMsg({ type: 'success', text: 'Record added successfully.' })
      setForm(BLANK[entityKey])
      onSuccess()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 14 : 0 }}>
        <h4 style={{ color: '#0a2540', fontSize: '0.9rem', fontWeight: 700 }}>Add Single Record</h4>
        <button className="panel-toggle-btn" onClick={() => setOpen(o => !o)}>
          {open ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit}>
          <div className="admin-form-grid">
            {entityKey === 'Users' && <>
              <div className="form-field"><label>Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div className="form-field"><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
              <div className="form-field"><label>Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  {['Consultant','PracticeLead','CoELeadership','Admin'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Business Unit *</label><input value={form.businessUnit} onChange={e => set('businessUnit', e.target.value)} required /></div>
              <div className="form-field"><label>Department</label><input value={form.department} onChange={e => set('department', e.target.value)} /></div>
            </>}

            {entityKey === 'Sessions' && <>
              <div className="form-field"><label>Consultant *</label>
                <select value={form.consultant_ID} onChange={e => set('consultant_ID', e.target.value)} required>
                  <option value="">Select consultant</option>
                  {consultants.map(c => <option key={c.ID} value={c.ID}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Tool *</label>
                <select value={form.tool_ID} onChange={e => set('tool_ID', e.target.value)} required>
                  <option value="">Select tool</option>
                  {tools.map(t => <option key={t.ID} value={t.ID}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Session Date *</label><input type="date" value={form.sessionDate} onChange={e => set('sessionDate', e.target.value)} required /></div>
              <div className="form-field"><label>Duration (min) *</label><input type="number" min="1" value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} required /></div>
              <div className="form-field"><label>Task Type</label>
                <select value={form.taskType} onChange={e => set('taskType', e.target.value)}>
                  {['DocumentDrafting','CodeReview','DataAnalysis','Research','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)}>
                  <option>Manual</option><option>Automatic</option>
                </select>
              </div>
            </>}

            {entityKey === 'Ideas' && <>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} required /></div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Description</label><input value={form.description} onChange={e => set('description', e.target.value)} /></div>
              <div className="form-field"><label>Submitter *</label>
                <select value={form.submitter_ID} onChange={e => set('submitter_ID', e.target.value)} required>
                  <option value="">Select consultant</option>
                  {consultants.map(c => <option key={c.ID} value={c.ID}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {['Submitted','Approved','Implemented'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </>}

            {entityKey === 'LearningCourses' && <>
              <div className="form-field"><label>Course Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div className="form-field"><label>Duration (hrs) *</label><input type="number" min="0.5" step="0.5" value={form.durationHours} onChange={e => set('durationHours', e.target.value)} required /></div>
              <div className="form-field"><label>Related Tool</label>
                <select value={form.relatedTool_ID} onChange={e => set('relatedTool_ID', e.target.value)}>
                  <option value="">— None —</option>
                  {tools.map(t => <option key={t.ID} value={t.ID}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Description</label><input value={form.description} onChange={e => set('description', e.target.value)} /></div>
            </>}
          </div>

          {msg && (
            <div className={msg.type === 'success' ? 'success-banner' : 'error-banner'} style={{ marginBottom: 12 }}>
              {msg.text}
            </div>
          )}

          <div className="admin-form-actions">
            <button className="submit-btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Data table ────────────────────────────────────────────────────────────────
function DataTable({ config, rows, loading }) {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const total = rows.length
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => setPage(0), [config.label])

  if (loading) return <div className="loading">Loading {config.label}...</div>

  return (
    <div className="admin-form-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ color: '#0a2540', fontSize: '0.9rem', fontWeight: 700 }}>
          {config.label} <span style={{ fontWeight: 400, color: '#5a6a85' }}>({total} records)</span>
        </h4>
        {total > PAGE_SIZE && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8rem', color: '#5a6a85' }}>
            <button className="panel-toggle-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span>Page {page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="panel-toggle-btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>

      {total === 0
        ? <p className="empty-state">No records found.</p>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-table">
              <thead>
                <tr>{config.columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr key={row.ID ?? i}>
                    {config.columns.map(c => {
                      const val = getVal(row, c.key)
                      const isStatus = c.key === 'status' || c.key === 'completionStatus'
                      return (
                        <td key={c.key}>
                          {isStatus && val !== '—'
                            ? <StatusBadge value={val} />
                            : String(val)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ── Tab content ───────────────────────────────────────────────────────────────
function TabContent({ entityKey, consultants, tools }) {
  const config = ENTITY_CONFIG[entityKey]
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  function loadData() {
    setLoading(true)
    apiGet(config.endpoint)
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [entityKey])

  return (
    <div className="admin-content">
      <div className="admin-section-title">{config.icon} {config.label}</div>
      <div className="admin-section-sub">
        Manage {config.label.toLowerCase()} — add single records or bulk upload via Excel/CSV
      </div>

      <AddForm entityKey={entityKey} consultants={consultants} tools={tools} onSuccess={loadData} />
      <BulkUploadZone config={config} onSuccess={loadData} />
      <DataTable config={config} rows={rows} loading={loading} />
    </div>
  )
}

// ── Main AdminPanel component (left sidebar + content) ────────────────────────
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('Users')
  const [consultants, setConsultants] = useState([])
  const [tools, setTools] = useState([])

  useEffect(() => {
    apiGet('/Consultants?$select=ID,name&$orderby=name').then(d => setConsultants(d || [])).catch(() => {})
    apiGet('/AITools?$select=ID,name&$orderby=name').then(d => setTools(d || [])).catch(() => {})
  }, [])

  return (
    <>
      {/* Left Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">Admin Panel</div>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`admin-tab-btn ${activeTab === tab ? 'admin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span>{ENTITY_CONFIG[tab].icon}</span>
            {ENTITY_CONFIG[tab].label}
          </button>
        ))}
      </aside>

      {/* Tab Content rendered in the right area via app-body flex */}
      <TabContent
        key={activeTab}
        entityKey={activeTab}
        consultants={consultants}
        tools={tools}
      />
    </>
  )
}
