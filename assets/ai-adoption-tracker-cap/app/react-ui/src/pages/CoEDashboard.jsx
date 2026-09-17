import { useState, useEffect } from 'react'
import { apiGet } from '../hooks/useApi.js'

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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiGet('/getCoEStats()')
      .then(d => { setStats(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="loading">Loading CoE Dashboard...</div>
  if (error)   return <div className="error">Error: {error}</div>
  if (!stats)  return null

  const healthColor = stats.healthScore >= 75 ? '#107e3e' : stats.healthScore >= 50 ? '#e9730c' : '#cc1919'
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
      <p className="dashboard-subtitle">AI Tool Adoption — ENR Practice Overview</p>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Adoption Rate</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{stats.adoptionPct}%</div>
          <div className="kpi-sub">Active + Occasional</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Non-Adopters</div>
          <div className="kpi-value" style={{ color: '#cc1919' }}>{stats.nonAdopters}</div>
          <div className="kpi-sub">out of {stats.totalConsultants} consultants</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Hours Saved</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>{stats.totalHoursSaved}</div>
          <div className="kpi-sub">estimated total hours</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Health Score</div>
          <div className="kpi-value" style={{ color: healthColor }}>{stats.healthScore}<span style={{ fontSize: '1rem' }}>/100</span></div>
          <div className="kpi-sub">Top tool: {stats.topTool}</div>
        </div>
      </div>

      <div className="charts-row">
        {/* Tier Breakdown */}
        <div className="chart-card">
          <h3>Adoption Tier Breakdown</h3>
          {tierData.map(t => (
            <div key={t.key} className="tier-row">
              <span className="tier-badge" style={{ background: TIER_COLORS[t.key] }}>
                {TIER_LABELS[t.key]}
              </span>
              <div className="tier-bar-wrap">
                <div
                  className="tier-bar"
                  style={{
                    width: stats.totalConsultants > 0 ? `${(t.count / stats.totalConsultants) * 100}%` : '0%',
                    background: TIER_COLORS[t.key]
                  }}
                />
              </div>
              <span className="tier-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Tool Breakdown */}
        <div className="chart-card">
          <h3>Tool Usage Breakdown</h3>
          {stats.toolBreakdown?.map(t => (
            <div key={t.toolName} className="tier-row">
              <span className="tool-name">{t.toolName}</span>
              <div className="tier-bar-wrap">
                <div
                  className="tier-bar"
                  style={{ width: `${(t.sessionCount / maxToolCount) * 100}%`, background: '#0057b8' }}
                />
              </div>
              <span className="tier-count">{t.sessionCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
