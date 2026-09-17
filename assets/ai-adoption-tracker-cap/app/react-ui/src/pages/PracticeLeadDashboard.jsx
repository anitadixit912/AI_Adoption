import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch } from '../hooks/useApi.js'

const TIER_COLORS = {
  ActiveAdopter:  '#107e3e',
  OccasionalUser: '#e9730c',
  LapsedUser:     '#bb5504',
  NonAdopter:     '#cc1919'
}

const INTENSITY_COLORS = ['#f4f4f4', '#cce5ff', '#66b3ff', '#0057b8']

export default function PracticeLeadDashboard({ currentUser }) {
  const [heatmap, setHeatmap]         = useState([])
  const [nonAdopters, setNonAdopters] = useState([])
  const [loading, setLoading]         = useState(true)
  const [notes, setNotes]             = useState({})
  const [saving, setSaving]           = useState({})
  const [buFilter, setBuFilter]       = useState('')
  const [allBUs, setAllBUs]           = useState([])

  const leadID = currentUser?.ID ?? 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

  useEffect(() => {
    Promise.all([
      apiGet(`/getTeamHeatmap(practiceLeadID='${leadID}')`),
      apiGet('/getNonAdopterList(daysInactive=30)'),
      apiGet('/Consultants?$select=businessUnit&$orderby=businessUnit')
    ]).then(([hm, na, cons]) => {
      setHeatmap(hm)
      setNonAdopters(na)
      const bus = [...new Set(cons.map(c => c.businessUnit))]
      setAllBUs(bus)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [leadID])

  const tools = heatmap[0]?.toolUsage?.map(t => t.toolName) ?? []

  const filteredHeatmap = buFilter
    ? heatmap.filter(c => c.businessUnit === buFilter)
    : heatmap

  async function saveNote(consultantID) {
    setSaving(s => ({ ...s, [consultantID]: true }))
    try {
      const note = notes[consultantID] ?? {}
      await apiPost('/PracticeLeadNotes', {
        consultant_ID:    consultantID,
        practiceLeadID:   leadID,
        targetTier:       note.targetTier ?? 'OccasionalUser',
        notes:            note.notes ?? '',
        engagementStatus: note.engagementStatus ?? 'Active'
      })
    } finally {
      setSaving(s => ({ ...s, [consultantID]: false }))
    }
  }

  if (loading) return <div className="loading">Loading Practice Lead Dashboard...</div>

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Practice Lead Dashboard</h2>
      <p className="dashboard-subtitle">Team adoption heatmap, non-adopters, and coaching notes</p>

      {/* BU Filter */}
      <div className="filter-bar">
        <label>Filter by Business Unit: </label>
        <select value={buFilter} onChange={e => setBuFilter(e.target.value)}>
          <option value="">All BUs</option>
          {allBUs.map(bu => <option key={bu} value={bu}>{bu}</option>)}
        </select>
      </div>

      {/* Heatmap */}
      <div className="section-card">
        <h3>Consultant × Tool Heatmap (last 30 days)</h3>
        <div className="heatmap-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Consultant</th>
                <th>Tier</th>
                {tools.map(t => <th key={t}>{t}</th>)}
                <th>Target Tier</th>
                <th>Notes</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredHeatmap.map(c => (
                <tr key={c.consultantID}>
                  <td>{c.consultantName}</td>
                  <td>
                    <span className="tier-badge" style={{ background: TIER_COLORS[c.adoptionTier] ?? '#888' }}>
                      {c.adoptionTier}
                    </span>
                  </td>
                  {c.toolUsage?.map(t => (
                    <td key={t.toolName}
                      className="heat-cell"
                      title={`${t.sessionCount} sessions`}
                      style={{ background: INTENSITY_COLORS[t.intensity] }}
                    >
                      {t.sessionCount > 0 ? t.sessionCount : ''}
                    </td>
                  ))}
                  <td>
                    <select
                      value={notes[c.consultantID]?.targetTier ?? 'OccasionalUser'}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], targetTier: e.target.value } }))}
                    >
                      <option value="ActiveAdopter">Active Adopter</option>
                      <option value="OccasionalUser">Occasional User</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Add coaching note..."
                      value={notes[c.consultantID]?.notes ?? ''}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], notes: e.target.value } }))}
                    />
                  </td>
                  <td>
                    <select
                      value={notes[c.consultantID]?.engagementStatus ?? 'Active'}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], engagementStatus: e.target.value } }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Coaching">Coaching</option>
                      <option value="Escalated">Escalated</option>
                    </select>
                  </td>
                  <td>
                    <button className="save-btn" onClick={() => saveNote(c.consultantID)} disabled={saving[c.consultantID]}>
                      {saving[c.consultantID] ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Heatmap legend */}
        <div className="heatmap-legend">
          <span>Sessions (last 30 days):</span>
          {['None', 'Low (1-2)', 'Medium (3-5)', 'High (5+)'].map((l, i) => (
            <span key={l} className="legend-item">
              <span className="legend-box" style={{ background: INTENSITY_COLORS[i] }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Non-Adopter / Lapsed Alerts */}
      <div className="section-card">
        <h3>Non-Adopters &amp; Lapsed Alerts</h3>
        {nonAdopters.length === 0
          ? <p className="empty-state">No consultants inactive for 30+ days. Great work!</p>
          : (
            <table className="alert-table">
              <thead>
                <tr><th>Name</th><th>BU</th><th>Tier</th><th>Days Inactive</th><th>Last Active</th></tr>
              </thead>
              <tbody>
                {nonAdopters.map(c => (
                  <tr key={c.consultantID}>
                    <td>{c.consultantName}</td>
                    <td>{c.businessUnit}</td>
                    <td><span className="tier-badge" style={{ background: TIER_COLORS[c.adoptionTier] ?? '#888' }}>{c.adoptionTier}</span></td>
                    <td>
                      <span style={{ color: c.daysInactive >= 90 ? '#cc1919' : c.daysInactive >= 60 ? '#bb5504' : '#e9730c', fontWeight: 700 }}>
                        {c.daysInactive >= 999 ? 'Never' : `${c.daysInactive} days`}
                      </span>
                    </td>
                    <td>{c.lastActivityDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}
