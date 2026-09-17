import { useState, useEffect } from 'react'
import { apiGet } from '../hooks/useApi.js'
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

export default function CoEDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [modal, setModal]   = useState(null)   // { title, content }

  useEffect(() => {
    apiGet('/getCoEStats()')
      .then(d => { setStats(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="loading">Loading CoE Dashboard...</div>
  if (error)   return <div className="error">Error: {error}</div>
  if (!stats)  return null

  const healthColor = stats.healthScore >= 75 ? '#107e3e' : stats.healthScore >= 50 ? '#e9730c' : '#cc1919'
  const total = stats.totalConsultants || 1

  function openTierModal(tier) {
    const t = tierData.find(t => t.key === tier)
    if (!t) return
    setModal({
      title: TIER_LABELS[tier],
      content: (
        <>
          <div className="modal-row"><span className="modal-label">Headcount</span><span className="modal-value">{t.count} consultants</span></div>
          <div className="modal-row"><span className="modal-label">Percentage of total</span><span className="modal-value">{Math.round((t.count / total) * 100)}%</span></div>
          <div className="modal-row"><span className="modal-label">Total consultants</span><span className="modal-value">{total}</span></div>
          <div className="modal-section-title">What this means</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>
            {tier === 'ActiveAdopter'  && 'These consultants have used at least one AI tool in the last 30 days. They are actively benefiting from AI tools.'}
            {tier === 'OccasionalUser' && 'These consultants last used an AI tool between 31–60 days ago. They may need light encouragement to re-engage.'}
            {tier === 'LapsedUser'     && 'These consultants last used an AI tool between 61–90 days ago. A coaching conversation is recommended.'}
            {tier === 'NonAdopter'     && 'These consultants have never used an AI tool or have been inactive for over 90 days. Priority group for adoption drive.'}
          </p>
        </>
      )
    })
  }

  function openKpiModal(type) {
    const kpiContent = {
      adoption: (
        <>
          <div className="modal-row"><span className="modal-label">Overall Adoption Rate</span><span className="modal-value">{stats.adoptionPct}%</span></div>
          <div className="modal-row"><span className="modal-label">Active Adopters</span><span className="modal-value">{stats.activeAdopters}</span></div>
          <div className="modal-row"><span className="modal-label">Occasional Users</span><span className="modal-value">{stats.occasionalUsers}</span></div>
          <div className="modal-section-title">How it's calculated</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>Adoption Rate = (Active Adopters + Occasional Users) ÷ Total Consultants × 100</p>
        </>
      ),
      active: (
        <>
          <div className="modal-row"><span className="modal-label">Active Adopters</span><span className="modal-value">{stats.activeAdopters}</span></div>
          <div className="modal-row"><span className="modal-label">% of total</span><span className="modal-value">{Math.round((stats.activeAdopters / total) * 100)}%</span></div>
          <div className="modal-section-title">Definition</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>Consultants who used at least one AI tool within the last 30 days.</p>
        </>
      ),
      nonadopters: (
        <>
          <div className="modal-row"><span className="modal-label">Non-Adopters</span><span className="modal-value">{stats.nonAdopters}</span></div>
          <div className="modal-row"><span className="modal-label">% of total</span><span className="modal-value">{Math.round((stats.nonAdopters / total) * 100)}%</span></div>
          <div className="modal-section-title">Definition</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>Consultants with no AI tool usage ever, or inactive for over 90 days. No individual names are shown at this level — see Practice Lead view for details.</p>
        </>
      ),
      hours: (
        <>
          <div className="modal-row"><span className="modal-label">Total Estimated Hours Saved</span><span className="modal-value">{stats.totalHoursSaved} hrs</span></div>
          <div className="modal-row"><span className="modal-label">Avg per consultant</span><span className="modal-value">{(stats.totalHoursSaved / total).toFixed(1)} hrs</span></div>
          <div className="modal-section-title">How it's calculated</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a85', lineHeight: 1.6 }}>Each session logs an estimated hours saved based on duration × tool efficiency factor. Consultants can adjust this value from their own dashboard.</p>
        </>
      ),
      health: (
        <>
          <div className="modal-row"><span className="modal-label">Health Score</span><span className="modal-value" style={{ color: healthColor }}>{stats.healthScore}/100</span></div>
          <div className="modal-row"><span className="modal-label">Status</span><span className="modal-value">{stats.healthScore >= 75 ? '🟢 On track' : stats.healthScore >= 50 ? '🟡 Needs attention' : '🔴 Action required'}</span></div>
          <div className="modal-section-title">Scoring formula</div>
          <div className="modal-row"><span className="modal-label">40% — Overall adoption rate</span><span className="modal-value">{stats.adoptionPct}%</span></div>
          <div className="modal-row"><span className="modal-label">30% — Active adopter %</span><span className="modal-value">{Math.round((stats.activeAdopters / total) * 100)}%</span></div>
          <div className="modal-row"><span className="modal-label">30% — Hours saved score</span><span className="modal-value">based on {stats.totalHoursSaved} hrs</span></div>
        </>
      ),
      toptool: (
        <>
          <div className="modal-row"><span className="modal-label">Top Tool</span><span className="modal-value">{stats.topTool}</span></div>
          <div className="modal-section-title">All tools ranked by sessions</div>
          {stats.toolBreakdown?.map(t => (
            <div className="modal-row" key={t.toolName}>
              <span className="modal-label">{t.toolName}</span>
              <span className="modal-value">{t.sessionCount} sessions · {t.userCount} users</span>
            </div>
          ))}
        </>
      )
    }
    setModal({ title: { adoption:'Adoption Rate', active:'Active Adopters', nonadopters:'Non-Adopters', hours:'Hours Saved', health:'AI Health Score', toptool:'Tool Breakdown' }[type], content: kpiContent[type] })
  }

  const tierData = [
    { key: 'ActiveAdopter',  count: stats.activeAdopters },
    { key: 'OccasionalUser', count: stats.occasionalUsers },
    { key: 'LapsedUser',     count: stats.lapsedUsers },
    { key: 'NonAdopter',     count: stats.nonAdopters }
  ]
  const maxToolCount = Math.max(...(stats.toolBreakdown?.map(t => t.sessionCount) ?? [1]), 1)

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">CoE Leadership Dashboard</h2>
      <p className="dashboard-subtitle">AI Tool Adoption — ENR Practice Overview (Anonymous Summary) · <em style={{color:'#0057b8'}}>Click any tile for details</em></p>

      {/* KPI Cards — all clickable */}
      <div className="kpi-grid">
        <div className="kpi-card clickable" onClick={() => openKpiModal('adoption')}>
          <div className="kpi-label">Overall Adoption Rate</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{stats.adoptionPct}%</div>
          <div className="kpi-sub">Active + Occasional users ↗</div>
        </div>
        <div className="kpi-card clickable" onClick={() => openKpiModal('active')}>
          <div className="kpi-label">Active Adopters</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{stats.activeAdopters}</div>
          <div className="kpi-sub">{Math.round((stats.activeAdopters / total) * 100)}% of total — used AI in last 30 days ↗</div>
        </div>
        <div className="kpi-card clickable" onClick={() => openKpiModal('nonadopters')}>
          <div className="kpi-label">Non-Adopters</div>
          <div className="kpi-value" style={{ color: '#cc1919' }}>{stats.nonAdopters}</div>
          <div className="kpi-sub">{Math.round((stats.nonAdopters / total) * 100)}% of {total} consultants ↗</div>
        </div>
        <div className="kpi-card clickable" onClick={() => openKpiModal('hours')}>
          <div className="kpi-label">Hours Saved</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{stats.totalHoursSaved}</div>
          <div className="kpi-sub">estimated across all teams ↗</div>
        </div>
        <div className="kpi-card clickable" onClick={() => openKpiModal('health')}>
          <div className="kpi-label">AI Health Score</div>
          <div className="kpi-value" style={{ color: healthColor }}>{stats.healthScore}<span style={{ fontSize: '1rem' }}>/100</span></div>
          <div className="kpi-sub">{stats.healthScore >= 75 ? '🟢 On track' : stats.healthScore >= 50 ? '🟡 Needs attention' : '🔴 Action required'} ↗</div>
        </div>
        <div className="kpi-card clickable" onClick={() => openKpiModal('toptool')}>
          <div className="kpi-label">Top Tool</div>
          <div className="kpi-value" style={{ color: '#0057b8', fontSize: '1.6rem' }}>{stats.topTool}</div>
          <div className="kpi-sub">most used across all BUs ↗</div>
        </div>
      </div>

      <div className="charts-row">
        {/* Tier Breakdown — clickable rows */}
        <div className="chart-card">
          <h3>Adoption Tier Breakdown</h3>
          <p className="chart-note">Headcount and percentage only — no individual names · click a row for details</p>
          {tierData.map(t => {
            const pct = Math.round((t.count / total) * 100)
            return (
              <div key={t.key} className="tier-row clickable" onClick={() => openTierModal(t.key)}>
                <span className="tier-badge" style={{ background: TIER_COLORS[t.key] }}>
                  {TIER_LABELS[t.key]}
                </span>
                <div className="tier-bar-wrap">
                  <div className="tier-bar" style={{ width: `${pct}%`, background: TIER_COLORS[t.key] }} />
                </div>
                <span className="tier-count">{t.count} <span style={{ color: '#666', fontSize: '0.85rem' }}>({pct}%)</span></span>
              </div>
            )
          })}
        </div>

        {/* Tool Breakdown — clickable rows */}
        <div className="chart-card">
          <h3>Tool Usage Breakdown</h3>
          <p className="chart-note">Total sessions per tool · click a row for details</p>
          {stats.toolBreakdown?.map(t => (
            <div key={t.toolName} className="tier-row clickable" onClick={() => setModal({
              title: `${t.toolName} — Usage Details`,
              content: (
                <>
                  <div className="modal-row"><span className="modal-label">Total Sessions</span><span className="modal-value">{t.sessionCount}</span></div>
                  <div className="modal-row"><span className="modal-label">Unique Users</span><span className="modal-value">{t.userCount}</span></div>
                  <div className="modal-row"><span className="modal-label">% of all sessions</span><span className="modal-value">{Math.round((t.sessionCount / (stats.toolBreakdown.reduce((s,x)=>s+x.sessionCount,0)||1))*100)}%</span></div>
                  <div className="modal-section-title">Note</div>
                  <p style={{fontSize:'0.85rem',color:'#5a6a85',lineHeight:1.6}}>Individual user names are not shown at CoE level. See the Practice Lead view for team-level breakdown.</p>
                </>
              )
            })}>
              <span className="tool-name">{t.toolName}</span>
              <div className="tier-bar-wrap">
                <div className="tier-bar" style={{ width: `${(t.sessionCount / maxToolCount) * 100}%`, background: '#0057b8' }} />
              </div>
              <span className="tier-count">{t.sessionCount} sessions <span style={{ color: '#666', fontSize: '0.85rem' }}>· {t.userCount ?? '—'} users</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.content}</Modal>}
    </div>
  )
}
