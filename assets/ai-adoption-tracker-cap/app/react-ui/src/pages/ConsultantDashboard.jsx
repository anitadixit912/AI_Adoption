import { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '../hooks/useApi.js'

// The "me" consultant — update this ID when you replace Test User with your real profile
export const MY_CONSULTANT_ID = 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu'

const TIER_COLORS = {
  ActiveAdopter:  { bg: '#107e3e', label: '🟢 Active Adopter' },
  OccasionalUser: { bg: '#e9730c', label: '🟡 Occasional User' },
  LapsedUser:     { bg: '#bb5504', label: '🟠 Lapsed User' },
  NonAdopter:     { bg: '#cc1919', label: '🔴 Non-Adopter' }
}

const TOOL_DESCRIPTIONS = {
  JWD: 'Joule Work Desktop — AI assistant for workplace productivity & documentation',
  JS:  'Joule Studio — AI-assisted development environment for coding',
  J4C: 'Joule for Copilot — AI copilot for business workflows & analysis',
  J4D: 'Joule for Developers — AI assistant for advanced development tasks',
  EKX: 'EKX — Internal SAP AI tool for knowledge extraction'
}

export default function ConsultantDashboard() {
  const [consultant, setConsultant]     = useState(null)
  const [sessions, setSessions]         = useState([])
  const [peer, setPeer]                 = useState(null)
  const [notifications, setNotifications] = useState([])
  const [tools, setTools]               = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet(`/Consultants('${MY_CONSULTANT_ID}')?$expand=sessions($expand=tool)`),
      apiGet(`/getPeerComparison(consultantID=${MY_CONSULTANT_ID})`),
      apiGet(`/Notifications?$filter=consultant_ID eq ${MY_CONSULTANT_ID}&$orderby=createdAt desc`),
      apiGet('/AITools')
    ]).then(([c, p, n, t]) => {
      setConsultant(c)
      setSessions(c.sessions ?? [])
      setPeer(p)
      setNotifications(n)
      setTools(t)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function markRead(notifID) {
    await apiPatch(`/Notifications('${notifID}')`, { isRead: true })
    setNotifications(prev => prev.map(n => n.ID === notifID ? { ...n, isRead: true } : n))
  }

  if (loading) return <div className="loading">Loading your dashboard...</div>
  if (!consultant) return <div className="error">Could not load your profile.</div>

  const tier     = consultant.adoptionTier ?? 'NonAdopter'
  const tierInfo = TIER_COLORS[tier] ?? { bg: '#888', label: tier }

  // Aggregate sessions per tool
  const sessionsByTool = {}
  for (const s of sessions) {
    const name = s.tool?.name ?? s.tool_ID
    if (!sessionsByTool[name]) sessionsByTool[name] = { count: 0, hours: 0 }
    sessionsByTool[name].count++
    sessionsByTool[name].hours += (s.consultantAdjustedHours ?? s.estimatedHoursSaved ?? 0)
  }

  const usedToolNames  = Object.keys(sessionsByTool)
  const unusedTools    = (peer?.toolsNotUsed ?? tools.filter(t => !usedToolNames.includes(t.name)).map(t => t.name))
  const unreadCount    = notifications.filter(n => !n.isRead).length

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">My AI Adoption Dashboard</h2>
      <p className="dashboard-subtitle">Hi {consultant.name} 👋 — here's your personal AI usage overview</p>

      {/* Profile + Tier */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderTop: `4px solid ${tierInfo.bg}` }}>
          <div className="kpi-label">My Adoption Tier</div>
          <div className="kpi-value" style={{ color: tierInfo.bg, fontSize: '1.2rem' }}>{tierInfo.label}</div>
          <div className="kpi-sub">{consultant.businessUnit} · {consultant.department}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Sessions</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{sessions.length}</div>
          <div className="kpi-sub">across all AI tools</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Hours Saved</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>
            {sessions.reduce((s, r) => s + (r.consultantAdjustedHours ?? r.estimatedHoursSaved ?? 0), 0).toFixed(1)}
          </div>
          <div className="kpi-sub">estimated hours saved</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Peer Rank</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>
            {peer ? `Top ${100 - peer.percentileRank}%` : '—'}
          </div>
          <div className="kpi-sub">
            {peer ? `Avg in BU: ${peer.avgSessionsInBU} sessions` : 'in your BU'}
          </div>
        </div>
      </div>

      {/* My Usage Per Tool */}
      <div className="section-card">
        <h3>My Usage by Tool</h3>
        {tools.length === 0
          ? <p className="empty-state">No tools found.</p>
          : (
            <div className="tool-cards">
              {tools.map(tool => {
                const usage = sessionsByTool[tool.name]
                return (
                  <div key={tool.ID} className={`tool-card ${!usage ? 'tool-card--unused' : ''}`}>
                    <div className="tool-card-name">{tool.name}</div>
                    <div className="tool-card-desc">{TOOL_DESCRIPTIONS[tool.name] ?? ''}</div>
                    {usage
                      ? <>
                          <div className="tool-stat"><strong>{usage.count}</strong> sessions</div>
                          <div className="tool-stat"><strong>{usage.hours.toFixed(1)}</strong> hrs saved</div>
                        </>
                      : <div className="tool-card-unused">Not tried yet — give it a go!</div>
                    }
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

      {/* Peer Comparison */}
      {peer && (
        <div className="section-card">
          <h3>Peer Comparison</h3>
          <div className="peer-box">
            <div className="peer-stat">
              <span className="peer-big">{peer.mySessionCount}</span>
              <span className="peer-label">My sessions (last 30 days)</span>
            </div>
            <div className="peer-vs">vs</div>
            <div className="peer-stat">
              <span className="peer-big">{peer.avgSessionsInBU}</span>
              <span className="peer-label">BU average</span>
            </div>
            <div className="peer-rank" style={{ color: peer.percentileRank >= 50 ? '#107e3e' : '#e9730c' }}>
              You are in the <strong>top {100 - peer.percentileRank}%</strong> of {consultant.businessUnit}
            </div>
          </div>
          {unusedTools.length > 0 && (
            <div className="unused-tools">
              <strong>Tools you haven't tried recently:</strong>
              <div className="unused-tool-list">
                {unusedTools.map(t => (
                  <span key={t} className="unused-tool-badge">{t}</span>
                ))}
              </div>
              <p className="unused-tip">Try one of these tools this week to boost your adoption tier!</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="section-card">
        <h3>My Notifications {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}</h3>
        {notifications.length === 0
          ? <p className="empty-state">No notifications yet.</p>
          : notifications.map(n => (
            <div key={n.ID} className={`notif-item ${n.isRead ? 'notif-read' : 'notif-unread'}`}>
              <div className="notif-type">{n.type}</div>
              <div className="notif-title">{n.title}</div>
              <div className="notif-msg">{n.message}</div>
              {!n.isRead && (
                <button className="dismiss-btn" onClick={() => markRead(n.ID)}>
                  Mark as read
                </button>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}
