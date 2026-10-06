import { useState, useEffect } from 'react'

const BASE = '/AdoptionService'

const TASK_TYPES = [
  { value: 'DocumentDrafting', label: 'Document Drafting' },
  { value: 'CodeReview',       label: 'Code Review'       },
  { value: 'DataAnalysis',     label: 'Data Analysis'     },
  { value: 'Research',         label: 'Research'          },
  { value: 'Other',            label: 'Other'             },
]

const DURATIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

const CATEGORIES = ['Coding', 'Research', 'Documentation', 'DataAnalysis', 'Other']

const CATEGORY_COLORS = {
  Coding:        { bg: '#e8f0fe', color: '#1a73e8' },
  Research:      { bg: '#e6f4ea', color: '#188038' },
  Documentation: { bg: '#fce8b2', color: '#b06000' },
  DataAnalysis:  { bg: '#f3e8fd', color: '#7c1fa0' },
  Other:         { bg: '#f1f3f4', color: '#5f6368' },
}

const EFFICIENCY = { JWD: 0.60, JS: 0.65, J4C: 0.70, J4D: 0.70, EKX: 0.60 }

function today() {
  return new Date().toISOString().split('T')[0]
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  return res.json()
}

// ── My Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ currentUser }) {
  const [form, setForm]       = useState({ name: '', email: '', jobTitle: '', businessUnit: '', department: '', managerName: '', joinDate: '' })
  const [saving, setSaving]   = useState(false)
  const [banner, setBanner]   = useState(null) // { type: 'success'|'error', text }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/Consultants('${currentUser.id}')`)
      .then(data => {
        setForm({
          name:         data.name         ?? '',
          email:        data.email        ?? '',
          jobTitle:     data.jobTitle     ?? '',
          businessUnit: data.businessUnit ?? '',
          department:   data.department   ?? '',
          managerName:  data.managerName  ?? '',
          joinDate:     data.joinDate     ?? '',
        })
      })
      .catch(() => setBanner({ type: 'error', text: 'Could not load your profile.' }))
      .finally(() => setLoading(false))
  }, [currentUser.id])

  const handleSave = async () => {
    setSaving(true)
    setBanner(null)
    try {
      await apiFetch('/updateMyProfile', {
        method: 'POST',
        body: JSON.stringify({ ...form, consultantID: currentUser?.id }),
      })
      setBanner({ type: 'success', text: 'Profile saved successfully.' })
    } catch (e) {
      setBanner({ type: 'error', text: `Save failed: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="de-loading">Loading profile…</div>

  return (
    <div className="de-section">
      <div className="de-section-header">
        <h2 className="de-section-title">My Profile</h2>
        <p className="de-section-sub">Keep your details up to date so your usage data is attributed correctly.</p>
      </div>

      {banner && (
        <div className={`de-banner de-banner--${banner.type}`}>{banner.text}</div>
      )}

      <div className="de-form-card">
        <div className="de-form-grid">
          <label className="de-field">
            <span>Full Name</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
          </label>
          <label className="de-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
          </label>
          <label className="de-field">
            <span>Job Title</span>
            <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="e.g. Senior Consultant" />
          </label>
          <label className="de-field">
            <span>Business Unit</span>
            <input value={form.businessUnit} onChange={e => setForm(f => ({ ...f, businessUnit: e.target.value }))} placeholder="e.g. ENR-North" />
          </label>
          <label className="de-field">
            <span>Department / Practice</span>
            <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering Practice" />
          </label>
          <label className="de-field">
            <span>Manager Name</span>
            <input value={form.managerName} onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))} placeholder="Your manager's name" />
          </label>
          <label className="de-field">
            <span>Join Date</span>
            <input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </label>
        </div>

        <div className="de-form-actions">
          <button className="de-btn de-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Log AI Usage Tab ──────────────────────────────────────────────────────────
function LogUsageTab({ currentUser, onNavigate, onSessionLogged }) {
  const [tools, setTools]       = useState([])
  const [toolID, setToolID]     = useState('')
  const [toolName, setToolName] = useState('')
  const [taskType, setTaskType] = useState('Other')
  const [date, setDate]         = useState(today())
  const [duration, setDuration] = useState(30)
  const [selfHours, setSelfHours] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [banner, setBanner]     = useState(null)
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => {
    apiFetch('/AITools?$orderby=name')
      .then(d => {
        setTools(d.value ?? [])
        const ekx = (d.value ?? []).find(t => t.name === 'EKX')
        if (ekx) { setToolID(ekx.ID); setToolName(ekx.name) }
        else if ((d.value ?? []).length) { setToolID(d.value[0].ID); setToolName(d.value[0].name) }
      })
      .catch(() => setBanner({ type: 'error', text: 'Could not load tools. Please refresh the page.' }))
  }, [])

  const estimatedHours = toolName && EFFICIENCY[toolName]
    ? ((duration / 60) * EFFICIENCY[toolName]).toFixed(2)
    : null

  const handleSubmit = async () => {
    if (!toolID) { setBanner({ type: 'error', text: 'Please select a tool.' }); return }
    setSubmitting(true)
    setBanner(null)
    try {
      const body = {
        toolID,
        taskType,
        sessionDate:   date,
        durationMinutes: Number(duration),
        consultantID: currentUser?.id,
        ...(selfHours ? { selfReportedHoursSaved: Number(selfHours) } : {}),
      }
      const result = await apiFetch('/logManualSession', { method: 'POST', body: JSON.stringify(body) })
      setLastSession({ toolName, duration, date, estimatedHours, selfHours })
      setBanner({ type: 'success', text: 'Session logged!' })
      setSelfHours('')
      setDate(today())
      // Trigger classification so adoption tier updates, then refresh the dashboard
      apiFetch('/runClassification', { method: 'POST', body: '{}' }).catch(() => {})
      onSessionLogged?.()
    } catch (e) {
      setBanner({ type: 'error', text: `Failed to log session: ${e.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="de-section">
      <div className="de-section-header">
        <h2 className="de-section-title">Log AI Usage</h2>
        <p className="de-section-sub">Record a session where you used an AI tool. This data powers your adoption dashboard.</p>
      </div>

      {banner && (
        <div className={`de-banner de-banner--${banner.type}`}>
          {banner.text}
          {banner.type === 'success' && onNavigate && (
            <button className="de-banner-link" onClick={() => onNavigate('self')}>
              View my dashboard →
            </button>
          )}
        </div>
      )}

      <div className="de-form-card">
        <div className="de-form-grid">
          <label className="de-field">
            <span>AI Tool</span>
            <select value={toolID} onChange={e => {
              const t = tools.find(x => x.ID === e.target.value)
              setToolID(e.target.value)
              setToolName(t?.name ?? '')
            }}>
              {tools.map(t => <option key={t.ID} value={t.ID}>{t.name}</option>)}
            </select>
          </label>
          <label className="de-field">
            <span>Task Type</span>
            <select value={taskType} onChange={e => setTaskType(e.target.value)}>
              {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="de-field">
            <span>Date</span>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="de-field">
            <span>Duration</span>
            <select value={String(duration)} onChange={e => setDuration(Number(e.target.value))}>
              {DURATIONS.map(d => <option key={d.value} value={String(d.value)}>{d.label}</option>)}
            </select>
          </label>
          <label className="de-field">
            <span>System Estimate</span>
            <div className="de-readonly-field">
              {estimatedHours ? `${estimatedHours} hrs saved` : '—'}
            </div>
          </label>
          <label className="de-field">
            <span>Your Estimate (optional)</span>
            <input
              type="number"
              min="0"
              step="0.25"
              value={selfHours}
              onChange={e => setSelfHours(e.target.value)}
              placeholder="e.g. 1.5"
            />
          </label>
        </div>
        <p className="de-hint">Your estimate is collected alongside the system estimate — both are used for reporting.</p>
        <div className="de-form-actions">
          <button className="de-btn de-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Logging…' : 'Log Session'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Tools Tab ──────────────────────────────────────────────────────────────
function AIToolsTab({ role }) {
  const [tools, setTools]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ name: '', description: '', category: 'Other', rolloutDate: '', licensedUsersCount: '' })
  const [saving, setSaving]     = useState(false)
  const [banner, setBanner]     = useState(null)

  const loadTools = () =>
    apiFetch('/AITools?$orderby=name')
      .then(d => setTools(d.value ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { loadTools() }, [])

  const handleAddTool = async () => {
    if (!addForm.name) { setBanner({ type: 'error', text: 'Tool name is required.' }); return }
    setSaving(true)
    setBanner(null)
    try {
      const body = {
        name:               addForm.name,
        description:        addForm.description,
        category:           addForm.category,
        ...(addForm.rolloutDate ? { rolloutDate: addForm.rolloutDate } : {}),
        ...(addForm.licensedUsersCount ? { licensedUsersCount: Number(addForm.licensedUsersCount) } : {}),
      }
      await apiFetch('/addAITool', { method: 'POST', body: JSON.stringify(body) })
      setBanner({ type: 'success', text: `Tool "${addForm.name}" added.` })
      setAddForm({ name: '', description: '', category: 'Other', rolloutDate: '', licensedUsersCount: '' })
      setShowAdd(false)
      loadTools()
    } catch (e) {
      setBanner({ type: 'error', text: `Failed: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="de-section">
      <div className="de-section-header">
        <h2 className="de-section-title">AI Tools</h2>
        <p className="de-section-sub">These are the AI tools available in the ENR practice. Use the tool name when logging sessions.</p>
      </div>

      {banner && <div className={`de-banner de-banner--${banner.type}`}>{banner.text}</div>}

      {loading ? (
        <div className="de-loading">Loading tools…</div>
      ) : (
        <div className="tool-card-grid">
          {tools.map(t => (
            <div key={t.ID} className="tool-card">
              <div className="tool-card-top">
                <span className="tool-card-name">{t.name}</span>
                {t.category && (
                  <span
                    className="tool-category-badge"
                    style={CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.Other}
                  >{t.category}</span>
                )}
              </div>
              <p className="tool-card-desc">{t.description || <em>No description</em>}</p>
              <div className="tool-card-meta">
                {t.rolloutDate && <span>Rollout: {t.rolloutDate}</span>}
                {t.licensedUsersCount != null && <span>{t.licensedUsersCount} licensed users</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {role === 'Admin' && (
        <div className="de-form-card de-admin-add-tool">
          <button className="de-toggle-btn" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? '▲ Hide' : '+ Add New Tool'}
          </button>
          {showAdd && (
            <>
              <div className="de-form-grid" style={{ marginTop: 16 }}>
                <label className="de-field">
                  <span>Tool Name <span className="de-required">*</span></span>
                  <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. JWD" />
                </label>
                <label className="de-field">
                  <span>Description</span>
                  <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
                </label>
                <label className="de-field">
                  <span>Category</span>
                  <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="de-field">
                  <span>Rollout Date</span>
                  <input type="date" value={addForm.rolloutDate} onChange={e => setAddForm(f => ({ ...f, rolloutDate: e.target.value }))} />
                </label>
                <label className="de-field">
                  <span>Licensed Users</span>
                  <input type="number" min="0" value={addForm.licensedUsersCount} onChange={e => setAddForm(f => ({ ...f, licensedUsersCount: e.target.value }))} placeholder="e.g. 200" />
                </label>
              </div>
              <div className="de-form-actions">
                <button className="de-btn de-btn--primary" onClick={handleAddTool} disabled={saving}>
                  {saving ? 'Adding…' : 'Add Tool'}
                </button>
                <button className="de-btn de-btn--ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main DataEntry Page ───────────────────────────────────────────────────────
const TABS = [
  { key: 'profile', label: 'My Profile'    },
  { key: 'log',     label: 'Log AI Usage'  },
  { key: 'tools',   label: 'AI Tools'      },
]

export default function DataEntry({ currentUser, role, onNavigate, onSessionLogged }) {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="de-page">
      <div className="de-page-header">
        <div className="de-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`de-tab-btn${activeTab === t.key ? ' de-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="de-page-body">
        {activeTab === 'profile' && <ProfileTab currentUser={currentUser} />}
        {activeTab === 'log'     && <LogUsageTab currentUser={currentUser} onNavigate={onNavigate} onSessionLogged={onSessionLogged} />}
        {activeTab === 'tools'   && <AIToolsTab role={role} />}
      </div>
    </div>
  )
}
