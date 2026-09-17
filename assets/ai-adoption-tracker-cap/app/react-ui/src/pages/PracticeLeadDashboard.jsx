import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../hooks/useApi.js'
import Modal from '../components/Modal.jsx'

const TIER_COLORS = {
  ActiveAdopter:  '#107e3e',
  OccasionalUser: '#e9730c',
  LapsedUser:     '#bb5504',
  NonAdopter:     '#cc1919'
}

const TIER_LABELS = {
  ActiveAdopter:  'Active Adopter',
  OccasionalUser: 'Occasional User',
  LapsedUser:     'Lapsed User',
  NonAdopter:     'Non-Adopter'
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
  const [modal, setModal]             = useState(null)

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
  const filteredHeatmap = buFilter ? heatmap.filter(c => c.businessUnit === buFilter) : heatmap

  // Summary stats from heatmap
  const totalTeam      = heatmap.length
  const activeCount    = heatmap.filter(c => c.adoptionTier === 'ActiveAdopter').length
  const atRiskCount    = heatmap.filter(c => c.adoptionTier === 'LapsedUser' || c.adoptionTier === 'NonAdopter').length
  const adoptionPct    = totalTeam ? Math.round((activeCount / totalTeam) * 100) : 0

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

  function openConsultantModal(c) {
    setModal({
      title: `${c.consultantName} — Details`,
      content: (
        <>
          <div className="modal-row"><span className="modal-label">Name</span><span className="modal-value">{c.consultantName}</span></div>
          <div className="modal-row"><span className="modal-label">Business Unit</span><span className="modal-value">{c.businessUnit}</span></div>
          <div className="modal-row">
            <span className="modal-label">Adoption Tier</span>
            <span className="modal-value" style={{ color: TIER_COLORS[c.adoptionTier] ?? '#888' }}>
              {TIER_LABELS[c.adoptionTier] ?? c.adoptionTier}
            </span>
          </div>
          <div className="modal-section-title">Tool Usage (last 30 days)</div>
          {c.toolUsage?.map(t => (
            <div className="modal-row" key={t.toolName}>
              <span className="modal-label">{t.toolName}</span>
              <span className="modal-value">{t.sessionCount > 0 ? `${t.sessionCount} sessions` : 'No sessions'}</span>
            </div>
          ))}
        </>
      )
    })
  }

  function openNonAdopterModal(c) {
    setModal({
      title: `${c.consultantName} — Inactivity Alert`,
      content: (
        <>
          <div className="modal-row"><span className="modal-label">Name</span><span className="modal-value">{c.consultantName}</span></div>
          <div className="modal-row"><span className="modal-label">Business Unit</span><span className="modal-value">{c.businessUnit}</span></div>
          <div className="modal-row">
            <span className="modal-label">Tier</span>
            <span className="modal-value" style={{ color: TIER_COLORS[c.adoptionTier] ?? '#888' }}>
              {TIER_LABELS[c.adoptionTier] ?? c.adoptionTier}
            </span>
          </div>
          <div className="modal-row">
            <span className="modal-label">Days Inactive</span>
            <span className="modal-value" style={{ color: c.daysInactive >= 90 ? '#cc1919' : '#bb5504', fontWeight: 700 }}>
              {c.daysInactive >= 999 ? 'Never used AI tools' : `${c.daysInactive} days`}
            </span>
          </div>
          <div className="modal-row"><span className="modal-label">Last Active</span><span className="modal-value">{c.lastActivityDate ?? '—'}</span></div>
          <div className="modal-section-title">Recommended action</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>
            {c.daysInactive >= 999
              ? 'This consultant has never used an AI tool. Schedule an onboarding session or share a quick-start guide.'
              : c.daysInactive >= 90
              ? 'High priority — schedule a 1:1 coaching conversation to understand barriers to adoption.'
              : c.daysInactive >= 60
              ? 'Send a nudge message or share a relevant use case to re-engage this consultant.'
              : 'Monitor — consider a light check-in if inactivity continues.'}
          </p>
        </>
      )
    })
  }

  if (loading) return <div className="loading">Loading Practice Lead Dashboard...</div>

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Practice Lead Dashboard</h2>
      <p className="dashboard-subtitle">Team adoption heatmap, non-adopters, and coaching notes · <em style={{ color: '#0057b8' }}>Click any row for details</em></p>

      {/* KPI Summary tiles */}
      <div className="kpi-grid">
        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'Team Size',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Total consultants</span><span className="modal-value">{totalTeam}</span></div>
              <div className="modal-section-title">By Business Unit</div>
              {allBUs.map(bu => {
                const count = heatmap.filter(c => c.businessUnit === bu).length
                return <div className="modal-row" key={bu}><span className="modal-label">{bu}</span><span className="modal-value">{count}</span></div>
              })}
            </>
          )
        })}>
          <div className="kpi-label">Team Size</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{totalTeam}</div>
          <div className="kpi-sub">consultants in your team ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'Active Adopters',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Active Adopters</span><span className="modal-value">{activeCount}</span></div>
              <div className="modal-row"><span className="modal-label">% of team</span><span className="modal-value">{adoptionPct}%</span></div>
              <div className="modal-section-title">Active team members</div>
              {heatmap.filter(c => c.adoptionTier === 'ActiveAdopter').map(c => (
                <div className="modal-row" key={c.consultantID}><span className="modal-label">{c.consultantName}</span><span className="modal-value">{c.businessUnit}</span></div>
              ))}
            </>
          )
        })}>
          <div className="kpi-label">Active Adopters</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{activeCount}</div>
          <div className="kpi-sub">{adoptionPct}% of your team ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'At-Risk Consultants',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Lapsed + Non-Adopters</span><span className="modal-value">{atRiskCount}</span></div>
              <div className="modal-section-title">Who needs attention</div>
              {heatmap.filter(c => c.adoptionTier === 'LapsedUser' || c.adoptionTier === 'NonAdopter').map(c => (
                <div className="modal-row" key={c.consultantID}>
                  <span className="modal-label">{c.consultantName}</span>
                  <span className="modal-value" style={{ color: TIER_COLORS[c.adoptionTier] }}>{TIER_LABELS[c.adoptionTier]}</span>
                </div>
              ))}
            </>
          )
        })}>
          <div className="kpi-label">At Risk</div>
          <div className="kpi-value" style={{ color: '#cc1919' }}>{atRiskCount}</div>
          <div className="kpi-sub">Lapsed + Non-Adopters ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'Non-Adopter Alerts',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Inactive 30+ days</span><span className="modal-value">{nonAdopters.length}</span></div>
              <div className="modal-section-title">Action required</div>
              {nonAdopters.slice(0, 10).map(c => (
                <div className="modal-row" key={c.consultantID}>
                  <span className="modal-label">{c.consultantName}</span>
                  <span className="modal-value" style={{ color: '#cc1919' }}>{c.daysInactive >= 999 ? 'Never' : `${c.daysInactive}d`}</span>
                </div>
              ))}
            </>
          )
        })}>
          <div className="kpi-label">Inactivity Alerts</div>
          <div className="kpi-value" style={{ color: '#e9730c' }}>{nonAdopters.length}</div>
          <div className="kpi-sub">need follow-up ↗</div>
        </div>
      </div>

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
                <tr key={c.consultantID} className="clickable-row" style={{ cursor: 'pointer' }}>
                  <td onClick={() => openConsultantModal(c)} style={{ fontWeight: 600, color: '#0057b8', textDecoration: 'underline dotted' }}>{c.consultantName}</td>
                  <td onClick={() => openConsultantModal(c)}>
                    <span className="tier-badge" style={{ background: TIER_COLORS[c.adoptionTier] ?? '#888' }}>
                      {TIER_LABELS[c.adoptionTier] ?? c.adoptionTier}
                    </span>
                  </td>
                  {c.toolUsage?.map(t => (
                    <td key={t.toolName}
                      className="heat-cell clickable"
                      title={`${t.sessionCount} sessions — click for details`}
                      style={{ background: INTENSITY_COLORS[t.intensity] }}
                      onClick={() => setModal({
                        title: `${c.consultantName} — ${t.toolName}`,
                        content: (
                          <>
                            <div className="modal-row"><span className="modal-label">Tool</span><span className="modal-value">{t.toolName}</span></div>
                            <div className="modal-row"><span className="modal-label">Sessions (last 30 days)</span><span className="modal-value">{t.sessionCount}</span></div>
                            <div className="modal-row"><span className="modal-label">Usage level</span><span className="modal-value" style={{ background: INTENSITY_COLORS[t.intensity], padding: '2px 8px', borderRadius: 4 }}>{['None','Low','Medium','High'][t.intensity]}</span></div>
                          </>
                        )
                      })}
                    >
                      {t.sessionCount > 0 ? t.sessionCount : ''}
                    </td>
                  ))}
                  <td>
                    <select value={notes[c.consultantID]?.targetTier ?? 'OccasionalUser'}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], targetTier: e.target.value } }))}>
                      <option value="ActiveAdopter">Active Adopter</option>
                      <option value="OccasionalUser">Occasional User</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" placeholder="Add coaching note..."
                      value={notes[c.consultantID]?.notes ?? ''}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], notes: e.target.value } }))} />
                  </td>
                  <td>
                    <select value={notes[c.consultantID]?.engagementStatus ?? 'Active'}
                      onChange={e => setNotes(n => ({ ...n, [c.consultantID]: { ...n[c.consultantID], engagementStatus: e.target.value } }))}>
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

      {/* Non-Adopter Alerts */}
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
                  <tr key={c.consultantID} className="clickable-row" onClick={() => openNonAdopterModal(c)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: '#0057b8', textDecoration: 'underline dotted' }}>{c.consultantName}</td>
                    <td>{c.businessUnit}</td>
                    <td><span className="tier-badge" style={{ background: TIER_COLORS[c.adoptionTier] ?? '#888' }}>{TIER_LABELS[c.adoptionTier] ?? c.adoptionTier}</span></td>
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

      {/* Modal */}
      {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.content}</Modal>}
    </div>
  )
}
