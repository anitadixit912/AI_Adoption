import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../hooks/useApi.js'

const TASK_TYPES = ['DocumentDrafting', 'CodeReview', 'DataAnalysis', 'Research', 'Other']
const DURATIONS  = [15, 30, 45, 60, 90, 120]

const EFFICIENCY = { JWD: 0.60, JS: 0.65, J4C: 0.70, J4D: 0.70, EKX: 0.60 }

export default function LogSession() {
  const [tools, setTools]         = useState([])
  const [toolID, setToolID]       = useState('')
  const [toolName, setToolName]   = useState('')
  const [taskType, setTaskType]   = useState('Other')
  const [sessionDate, setDate]    = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration]   = useState(30)
  const [adjusted, setAdjusted]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    apiGet('/AITools').then(t => {
      setTools(t)
      const ekx = t.find(x => x.name === 'EKX')
      if (ekx) { setToolID(ekx.ID); setToolName(ekx.name) }
    })
  }, [])

  const estimated = toolName
    ? ((duration / 60) * (EFFICIENCY[toolName] ?? 0.60)).toFixed(2)
    : '—'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiPost('/logManualSession', {
        toolID,
        taskType,
        sessionDate,
        durationMinutes: duration
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Log an AI Tool Session</h2>
      <p className="dashboard-subtitle">
        Use this form to manually record usage for tools without automatic capture (e.g. EKX).
      </p>

      {success && <div className="success-banner">✅ Session logged successfully!</div>}
      {error   && <div className="error-banner">❌ Error: {error}</div>}

      <div className="section-card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit} className="log-form">
          <div className="form-field">
            <label>AI Tool *</label>
            <select
              value={toolID}
              onChange={e => {
                setToolID(e.target.value)
                setToolName(tools.find(t => t.ID === e.target.value)?.name ?? '')
              }}
              required
            >
              <option value="">Select a tool...</option>
              {tools.map(t => (
                <option key={t.ID} value={t.ID}>{t.name} — {t.description}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Task Type *</label>
            <select value={taskType} onChange={e => setTaskType(e.target.value)} required>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Date *</label>
            <input
              type="date"
              value={sessionDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Session Duration *</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} required>
              {DURATIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>

          <div className="form-field estimated-field">
            <label>Estimated Hours Saved</label>
            <div className="estimated-value">{estimated} hours</div>
            <span className="estimated-hint">System estimate based on session duration</span>
          </div>

          <div className="form-field">
            <label>Adjust Hours Saved <span className="optional">(optional)</span></label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder={`e.g. ${estimated}`}
              value={adjusted}
              onChange={e => setAdjusted(e.target.value)}
            />
            <span className="estimated-hint">Override if the estimate doesn't match your experience</span>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
