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

// Mock ENR average for comparison (until live data is available)
const ENR_AVG_ADOPTION_PCT = 57

// Use cases for Efficiency Insights (mock data — to be replaced with live data)
const USE_CASES = [
  { rank: 1, useCase: 'SAP process & configuration research', tool: 'EKX',        consultants: 14, avgHrs: 3.2 },
  { rank: 2, useCase: 'Functional specification drafting',     tool: 'J4C',        consultants: 11, avgHrs: 2.8 },
  { rank: 3, useCase: 'ABAP code analysis & interpretation',   tool: 'J4D',        consultants: 7,  avgHrs: 2.5 },
  { rank: 4, useCase: 'Business process review documentation', tool: 'J4C + EKX',  consultants: 9,  avgHrs: 2.2 },
  { rank: 5, useCase: 'Solution design exploration',           tool: 'EKX',        consultants: 8,  avgHrs: 2.0 },
  { rank: 6, useCase: 'Meeting prep & email summarisation',    tool: 'Joule Desktop', consultants: 10, avgHrs: 1.8 },
]

export default function PracticeLeadDashboard({ currentUser }) {
  const [heatmap, setHeatmap]               = useState([])
  const [nonAdopters, setNonAdopters]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [notes, setNotes]                   = useState({})
  const [saving, setSaving]                 = useState({})
  const [buFilter, setBuFilter]             = useState('')
  const [allBUs, setAllBUs]                 = useState([])
  const [modal, setModal]                   = useState(null)
  const [tierPanelOpen, setTierPanelOpen]   = useState(false)
  const [trendPeriod, setTrendPeriod]       = useState('weekly')

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

  // ── Summary stats ───────────────────────────────────────────────────────
  const totalTeam        = heatmap.length
  const activeCount      = heatmap.filter(c => c.adoptionTier === 'ActiveAdopter').length
  const occasionalCount  = heatmap.filter(c => c.adoptionTier === 'OccasionalUser').length
  const lapsedCount      = heatmap.filter(c => c.adoptionTier === 'LapsedUser').length
  const nonAdopterCount  = heatmap.filter(c => c.adoptionTier === 'NonAdopter').length
  const atRiskCount      = lapsedCount + nonAdopterCount
  const adoptionPct      = totalTeam ? Math.round((activeCount / totalTeam) * 100) : 0
  const weeklyActivePct  = totalTeam ? Math.round(((activeCount + occasionalCount) / totalTeam) * 100) : 0
  const diffVsEnr        = adoptionPct - ENR_AVG_ADOPTION_PCT
  const neverUsed        = nonAdopters.filter(c => c.daysInactive >= 999).length
  const lapsed30         = nonAdopters.filter(c => c.daysInactive < 999).length

  // ── Tool-by-tool adoption rates ─────────────────────────────────────────
  const toolAdoptionRates = tools.map(toolName => {
    const usersWithSessions = heatmap.filter(c =>
      c.toolUsage?.find(t => t.toolName === toolName && t.sessionCount > 0)
    ).length
    return { toolName, pct: totalTeam ? Math.round((usersWithSessions / totalTeam) * 100) : 0 }
  }).sort((a, b) => b.pct - a.pct)

  // ── Avg hours saved per week (mock calc from session data) ──────────────
  const avgHrsSaved = 3.4 // Will be replaced with live calculation

  // ── Trend data (mock — relative weeks) ─────────────────────────────────
  const trendData = trendPeriod === 'weekly'
    ? [
        { label: 'W-6', team: 52, enr: 54 },
        { label: 'W-5', team: 55, enr: 55 },
        { label: 'W-4', team: 58, enr: 55 },
        { label: 'W-3', team: 60, enr: 56 },
        { label: 'W-2', team: 62, enr: 56 },
        { label: 'W-1', team: 65, enr: 57 },
        { label: 'Now', team: adoptionPct, enr: ENR_AVG_ADOPTION_PCT },
      ]
    : [
        { label: 'Apr', team: 44, enr: 50 },
        { label: 'May', team: 48, enr: 51 },
        { label: 'Jun', team: 52, enr: 53 },
        { label: 'Jul', team: 56, enr: 54 },
        { label: 'Aug', team: 62, enr: 56 },
        { label: 'Sep', team: adoptionPct, enr: ENR_AVG_ADOPTION_PCT },
      ]

  const maxTrend = 100

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
      <p className="dashboard-subtitle">Team adoption overview, heatmap, non-adopters, and coaching notes · <em style={{ color: '#0057b8' }}>Click any row for details</em></p>

      {/* ── SECTION 1: ADOPTION OVERVIEW ─────────────────────────────────── */}
      <div className="section-header">ADOPTION OVERVIEW</div>

      {/* Key Metrics */}
      <div className="kpi-grid kpi-grid--wide">
        <div className="kpi-card kpi-card--highlight">
          <div className="kpi-label">My Team Adoption Rate</div>
          <div className="kpi-value" style={{ color: adoptionPct >= ENR_AVG_ADOPTION_PCT ? '#107e3e' : '#cc1919' }}>
            {adoptionPct}%
          </div>
          <div className="kpi-sub kpi-vs">
            vs {ENR_AVG_ADOPTION_PCT}% ENR avg&nbsp;
            <span style={{ color: diffVsEnr >= 0 ? '#107e3e' : '#cc1919', fontWeight: 700 }}>
              {diffVsEnr >= 0 ? '▲' : '▼'} {Math.abs(diffVsEnr)}pp
            </span>
          </div>
        </div>

        <div className="kpi-card clickable" onClick={() => setTierPanelOpen(true)}>
          <div className="kpi-label">Active Adopters / Total</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{activeCount} <span style={{ fontSize: '1rem', color: '#5a6a85' }}>/ {totalTeam}</span></div>
          <div className="kpi-sub">Click to see breakdown ↗</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Weekly Active Users</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{weeklyActivePct}%</div>
          <div className="kpi-sub">Active + Occasional users</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'Non-Adopter Breakdown',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Total non-adopters (30 days)</span><span className="modal-value" style={{ color: '#cc1919' }}>{nonAdopters.length}</span></div>
              <div className="modal-row"><span className="modal-label">Never used AI tools</span><span className="modal-value">{neverUsed}</span></div>
              <div className="modal-row"><span className="modal-label">Lapsed (inactive 30+ days)</span><span className="modal-value">{lapsed30}</span></div>
              <div className="modal-section-title">Who needs attention</div>
              {nonAdopters.map(c => (
                <div className="modal-row" key={c.consultantID}>
                  <span className="modal-label">{c.consultantName}</span>
                  <span className="modal-value" style={{ color: '#cc1919' }}>{c.daysInactive >= 999 ? 'Never' : `${c.daysInactive}d inactive`}</span>
                </div>
              ))}
            </>
          )
        })}>
          <div className="kpi-label">Non-Adopters (30 days)</div>
          <div className="kpi-value" style={{ color: '#cc1919' }}>{nonAdopters.length}</div>
          <div className="kpi-sub">{neverUsed} never used · {lapsed30} lapsed ↗</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Avg Hours Saved / Week</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{avgHrsSaved} hrs</div>
          <div className="kpi-sub">Self-reported by team</div>
        </div>
      </div>

      {/* Adoption Tier Breakdown — clickable */}
      <div className="section-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Adoption Tier Breakdown</h3>
          <button className="panel-toggle-btn" onClick={() => setTierPanelOpen(true)}>
            View Detail ↗
          </button>
        </div>
        {[
          { tier: 'ActiveAdopter',  count: activeCount },
          { tier: 'OccasionalUser', count: occasionalCount },
          { tier: 'LapsedUser',     count: lapsedCount },
          { tier: 'NonAdopter',     count: nonAdopterCount },
        ].map(({ tier, count }) => (
          <div key={tier} className="tier-row clickable" onClick={() => setTierPanelOpen(true)}>
            <span className="tier-badge" style={{ background: TIER_COLORS[tier] }}>{TIER_LABELS[tier]}</span>
            <div className="tier-bar-wrap">
              <div className="tier-bar" style={{ width: `${totalTeam ? (count / totalTeam) * 100 : 0}%`, background: TIER_COLORS[tier] }} />
            </div>
            <span className="tier-count">{count}</span>
            <span style={{ fontSize: '0.78rem', color: '#5a6a85', minWidth: 36 }}>({totalTeam ? Math.round((count / totalTeam) * 100) : 0}%)</span>
          </div>
        ))}
      </div>

      {/* Tool-by-Tool Adoption Rate */}
      <div className="section-card" style={{ marginBottom: 16 }}>
        <h3>Tool-by-Tool Adoption Rate</h3>
        <p className="chart-note">% of team with at least 1 session in last 30 days</p>
        {toolAdoptionRates.map(({ toolName, pct }) => (
          <div key={toolName} className="tier-row">
            <span className="tool-name" style={{ minWidth: 80 }}>{toolName}</span>
            <div className="tier-bar-wrap">
              <div className="tier-bar" style={{ width: `${pct}%`, background: '#0057b8' }} />
            </div>
            <span className="tier-count" style={{ color: '#0057b8' }}>{pct}%</span>
          </div>
        ))}
      </div>

      {/* ── SECTION 2: TREND GRAPH ────────────────────────────────────────── */}
      <div className="section-header">ADOPTION TREND</div>
      <div className="section-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Adoption Rate Over Time</h3>
          <div className="toggle-group">
            <button className={`toggle-btn ${trendPeriod === 'weekly' ? 'toggle-btn--active' : ''}`} onClick={() => setTrendPeriod('weekly')}>Weekly</button>
            <button className={`toggle-btn ${trendPeriod === 'monthly' ? 'toggle-btn--active' : ''}`} onClick={() => setTrendPeriod('monthly')}>Monthly</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingBottom: 24, position: 'relative' }}>
          {trendData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                {/* Team bar */}
                <div title={`Team: ${d.team}%`} style={{
                  width: 14, height: `${(d.team / maxTrend) * 120}px`,
                  background: '#0057b8', borderRadius: '3px 3px 0 0', minHeight: 4
                }} />
                {/* ENR avg bar */}
                <div title={`ENR avg: ${d.enr}%`} style={{
                  width: 14, height: `${(d.enr / maxTrend) * 120}px`,
                  background: '#90aecb', borderRadius: '3px 3px 0 0', minHeight: 4
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#5a6a85', marginTop: 4 }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <span style={{ width: 12, height: 12, background: '#0057b8', borderRadius: 2, display: 'inline-block' }} /> My Team
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <span style={{ width: 12, height: 12, background: '#90aecb', borderRadius: 2, display: 'inline-block' }} /> ENR Average
          </span>
        </div>
      </div>

      {/* ── SECTION 3: EFFICIENCY INSIGHTS ───────────────────────────────── */}
      <div className="section-header">EFFICIENCY INSIGHTS</div>
      <div className="section-card" style={{ marginBottom: 16 }}>
        <h3>Top Use Cases — Where AI Helps My Team Most</h3>
        <p className="chart-note">Ranked by average hours saved per week · Self-reported, September 2026 survey</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="use-case-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Use Case</th>
                <th>Primary Tool</th>
                <th>Consultants Using</th>
                <th>Avg Hrs Saved/Week</th>
              </tr>
            </thead>
            <tbody>
              {USE_CASES.map(u => (
                <tr key={u.rank}>
                  <td style={{ fontWeight: 700, color: '#0057b8', textAlign: 'center' }}>{u.rank}</td>
                  <td>{u.useCase}</td>
                  <td><span className="tool-tag">{u.tool}</span></td>
                  <td style={{ textAlign: 'center' }}>{u.consultants}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 10, overflow: 'hidden', minWidth: 80 }}>
                        <div style={{ width: `${(u.avgHrs / 3.5) * 100}%`, background: '#107e3e', height: '100%', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: '#107e3e', minWidth: 44 }}>{u.avgHrs} hrs</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 4: HEATMAP ───────────────────────────────────────────── */}
      <div className="section-header">TEAM HEATMAP</div>

      {/* BU Filter */}
      <div className="filter-bar">
        <label>Filter by Business Unit: </label>
        <select value={buFilter} onChange={e => setBuFilter(e.target.value)}>
          <option value="">All BUs</option>
          {allBUs.map(bu => <option key={bu} value={bu}>{bu}</option>)}
        </select>
      </div>

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

      {/* ── TIER BREAKDOWN SLIDE-IN PANEL ────────────────────────────────── */}
      {tierPanelOpen && (
        <div className="slide-panel-overlay" onClick={() => setTierPanelOpen(false)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="slide-panel-header">
              <span className="slide-panel-title">Adoption Tier Breakdown</span>
              <button className="modal-close" onClick={() => setTierPanelOpen(false)}>✕</button>
            </div>
            <div className="slide-panel-body">
              {[
                { tier: 'ActiveAdopter',  count: activeCount },
                { tier: 'OccasionalUser', count: occasionalCount },
                { tier: 'LapsedUser',     count: lapsedCount },
                { tier: 'NonAdopter',     count: nonAdopterCount },
              ].map(({ tier, count }) => {
                const members = heatmap.filter(c => c.adoptionTier === tier)
                return (
                  <div key={tier} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span className="tier-badge" style={{ background: TIER_COLORS[tier] }}>{TIER_LABELS[tier]}</span>
                      <span style={{ fontWeight: 700, color: TIER_COLORS[tier] }}>{count}</span>
                      <span style={{ fontSize: '0.78rem', color: '#5a6a85' }}>({totalTeam ? Math.round((count / totalTeam) * 100) : 0}%)</span>
                    </div>
                    <table className="tier-detail-table">
                      <thead>
                        <tr>
                          <th>Consultant</th>
                          <th>Last Activity</th>
                          <th>Tools Used (30 days)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0
                          ? <tr><td colSpan={3} style={{ color: '#5a6a85', fontStyle: 'italic' }}>None</td></tr>
                          : members.map(c => (
                            <tr key={c.consultantID}>
                              <td style={{ fontWeight: 600 }}>{c.consultantName}</td>
                              <td style={{ color: '#5a6a85' }}>{c.lastActivityDate ?? '—'}</td>
                              <td>
                                {c.toolUsage?.filter(t => t.sessionCount > 0).map(t => (
                                  <span key={t.toolName} className="tool-tag" style={{ marginRight: 4 }}>{t.toolName} ({t.sessionCount})</span>
                                ))}
                                {!c.toolUsage?.some(t => t.sessionCount > 0) && <span style={{ color: '#aaa', fontSize: '0.78rem' }}>None</span>}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.content}</Modal>}
    </div>
  )
}
