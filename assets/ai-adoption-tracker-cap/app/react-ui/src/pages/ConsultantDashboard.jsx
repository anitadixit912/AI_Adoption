import { useState, useEffect } from 'react'
import { apiGet, apiPatch } from '../hooks/useApi.js'
import Modal from '../components/Modal.jsx'

// The "me" consultant — update this ID when you replace Test User with your real profile
export const MY_CONSULTANT_ID = '238251a7-2498-4d41-ba9e-1061c91cc8fd'

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

const TOOL_LINKS = {
  JWD: 'https://www.sap.com/products/artificial-intelligence/ai-assistant.html',
  JS:  'https://www.sap.com/products/artificial-intelligence/ai-assistant.html',
  J4C: 'https://www.sap.com/products/artificial-intelligence/ai-assistant.html',
  J4D: 'https://www.sap.com/products/artificial-intelligence/ai-assistant.html',
  EKX: 'https://www.sap.com/products/artificial-intelligence.html'
}

export default function ConsultantDashboard({ currentUser }) {
  const consultantID = currentUser?.id ?? MY_CONSULTANT_ID
  const [consultant, setConsultant]       = useState(null)
  const [sessions, setSessions]           = useState([])
  const [peer, setPeer]                   = useState(null)
  const [notifications, setNotifications] = useState([])
  const [tools, setTools]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [modal, setModal]                 = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      apiGet(`/Consultants('${consultantID}')?$expand=sessions($expand=tool)`),
      apiGet(`/getPeerComparison(consultantID=${consultantID})`),
      apiGet(`/Notifications?$filter=consultant_ID eq ${consultantID}`),
      apiGet('/AITools')
    ]).then(([c, p, n, t]) => {
      setConsultant(c)
      setSessions(c.sessions ?? [])
      setPeer(p)
      setNotifications(n.value ?? n ?? [])
      setTools(t.value ?? t ?? [])
      setLoading(false)
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [consultantID])

  async function markRead(notifID) {
    await apiPatch(`/Notifications('${notifID}')`, { isRead: true })
    setNotifications(prev => prev.map(n => n.ID === notifID ? { ...n, isRead: true } : n))
  }

  if (loading) return <div className="loading">Loading your dashboard...</div>
  if (error) return <div className="error">Could not load your profile: {error}</div>
  if (!consultant) return <div className="error">Profile not found for ID: {consultantID}</div>

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

      {/* Profile + Tier — clickable KPI tiles */}
      <div className="kpi-grid">
        <div className="kpi-card clickable" style={{ borderTop: `4px solid ${tierInfo.bg}` }} onClick={() => setModal({
          title: 'My Adoption Tier',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Current Tier</span><span className="modal-value" style={{color: tierInfo.bg}}>{tierInfo.label}</span></div>
              <div className="modal-row"><span className="modal-label">Business Unit</span><span className="modal-value">{consultant.businessUnit}</span></div>
              <div className="modal-row"><span className="modal-label">Department</span><span className="modal-value">{consultant.department}</span></div>
              <div className="modal-row"><span className="modal-label">Last Activity</span><span className="modal-value">{consultant.lastActivityDate ?? 'Never'}</span></div>
              <div className="modal-section-title">Tier definitions</div>
              <div className="modal-row"><span className="modal-label">🟢 Active Adopter</span><span className="modal-value">Used AI in last 30 days</span></div>
              <div className="modal-row"><span className="modal-label">🟡 Occasional</span><span className="modal-value">31–60 days ago</span></div>
              <div className="modal-row"><span className="modal-label">🟠 Lapsed</span><span className="modal-value">61–90 days ago</span></div>
              <div className="modal-row"><span className="modal-label">🔴 Non-Adopter</span><span className="modal-value">No usage or 90+ days</span></div>
            </>
          )
        })}>
          <div className="kpi-label">My Adoption Tier</div>
          <div className="kpi-value" style={{ color: tierInfo.bg, fontSize: '1.2rem' }}>{tierInfo.label}</div>
          <div className="kpi-sub">{consultant.businessUnit} · {consultant.department} ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'My Sessions',
          content: (
            <>
              <div className="modal-row"><span className="modal-label">Total Sessions</span><span className="modal-value">{sessions.length}</span></div>
              <div className="modal-section-title">Session history</div>
              <div className="modal-sessions-list">
                {sessions.length === 0
                  ? <p style={{color:'#5a6a85',fontSize:'0.85rem'}}>No sessions recorded yet.</p>
                  : sessions.slice().sort((a,b) => new Date(b.sessionDate) - new Date(a.sessionDate)).map(s => (
                    <div className="modal-session-row" key={s.ID}>
                      <span><strong>{s.tool?.name ?? '—'}</strong> · {s.taskType ?? 'General'}</span>
                      <span>{s.sessionDate} · {s.durationMinutes} min</span>
                    </div>
                  ))
                }
              </div>
            </>
          )
        })}>
          <div className="kpi-label">Total Sessions</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>{sessions.length}</div>
          <div className="kpi-sub">across all AI tools ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => {
          const totalHrs = sessions.reduce((s, r) => s + (r.consultantAdjustedHours ?? r.estimatedHoursSaved ?? 0), 0)
          setModal({
            title: 'Hours Saved Breakdown',
            content: (
              <>
                <div className="modal-row"><span className="modal-label">Total Estimated Hours Saved</span><span className="modal-value">{totalHrs.toFixed(1)} hrs</span></div>
                <div className="modal-section-title">By tool</div>
                {Object.entries(sessionsByTool).map(([name, data]) => (
                  <div className="modal-row" key={name}>
                    <span className="modal-label">{name}</span>
                    <span className="modal-value">{data.hours.toFixed(1)} hrs · {data.count} sessions</span>
                  </div>
                ))}
                <div className="modal-section-title">How it's calculated</div>
                <p style={{fontSize:'0.85rem',color:'#5a6a85',lineHeight:1.6}}>Estimated hours = session duration × tool efficiency factor. You can adjust this from each session.</p>
              </>
            )
          })
        }}>
          <div className="kpi-label">Hours Saved</div>
          <div className="kpi-value" style={{ color: '#107e3e' }}>
            {sessions.reduce((s, r) => s + (r.consultantAdjustedHours ?? r.estimatedHoursSaved ?? 0), 0).toFixed(1)}
          </div>
          <div className="kpi-sub">estimated hours saved ↗</div>
        </div>

        <div className="kpi-card clickable" onClick={() => setModal({
          title: 'Peer Comparison',
          content: peer ? (
            <>
              <div className="modal-row"><span className="modal-label">My sessions (last 30 days)</span><span className="modal-value">{peer.mySessionCount}</span></div>
              <div className="modal-row"><span className="modal-label">BU average sessions</span><span className="modal-value">{peer.avgSessionsInBU}</span></div>
              <div className="modal-row"><span className="modal-label">My rank in {consultant.businessUnit}</span><span className="modal-value">Top {100 - peer.percentileRank}%</span></div>
              <div className="modal-section-title">Tools not tried recently</div>
              {(peer.toolsNotUsed ?? []).length === 0
                ? <p style={{fontSize:'0.85rem',color:'#107e3e'}}>You've used all available tools recently! 🎉</p>
                : (peer.toolsNotUsed ?? []).map(t => <span key={t} className="modal-tag">{t}</span>)
              }
            </>
          ) : <p style={{color:'#5a6a85'}}>No peer data available.</p>
        })}>
          <div className="kpi-label">Peer Rank</div>
          <div className="kpi-value" style={{ color: '#0057b8' }}>
            {peer ? `Top ${100 - peer.percentileRank}%` : '—'}
          </div>
          <div className="kpi-sub">{peer ? `Avg in BU: ${peer.avgSessionsInBU} sessions` : 'in your BU'} ↗</div>
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
                const toolSessions = sessions.filter(s => s.tool?.name === tool.name)
                return (
                  <div key={tool.ID} className={`tool-card clickable ${!usage ? 'tool-card--unused' : ''}`}
                    onClick={() => setModal({
                      title: `${tool.name} — My Usage`,
                      content: (
                        <>
                          <div className="modal-row"><span className="modal-label">Tool</span><span className="modal-value">{tool.name}</span></div>
                          <div className="modal-row"><span className="modal-label">Description</span><span className="modal-value" style={{fontSize:'0.8rem',textAlign:'right'}}>{TOOL_DESCRIPTIONS[tool.name]}</span></div>
                          <div className="modal-row"><span className="modal-label">Total Sessions</span><span className="modal-value">{usage?.count ?? 0}</span></div>
                          <div className="modal-row"><span className="modal-label">Hours Saved</span><span className="modal-value">{usage?.hours.toFixed(1) ?? '0.0'} hrs</span></div>
                          {toolSessions.length > 0 && (
                            <>
                              <div className="modal-section-title">Session history</div>
                              <div className="modal-sessions-list">
                                {toolSessions.sort((a,b) => new Date(b.sessionDate) - new Date(a.sessionDate)).map(s => (
                                  <div className="modal-session-row" key={s.ID}>
                                    <span>{s.taskType ?? 'General'} · {s.durationMinutes} min</span>
                                    <span>{s.sessionDate}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          {!usage && <p style={{color:'#e9730c',fontSize:'0.85rem',marginTop:12}}>You haven't tried this tool yet — log a session to get started!</p>}
                        </>
                      )
                    })}>
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
                  <span key={t} className="unused-tool-badge clickable" onClick={() => setModal({
                    title: `${t} — Get Started`,
                    content: (
                      <>
                        <div className="modal-row"><span className="modal-label">Tool</span><span className="modal-value">{t}</span></div>
                        <div className="modal-row"><span className="modal-label">Description</span><span className="modal-value" style={{fontSize:'0.8rem',textAlign:'right'}}>{TOOL_DESCRIPTIONS[t] ?? t}</span></div>
                        <div className="modal-section-title">Why try it?</div>
                        <p style={{fontSize:'0.85rem',color:'#5a6a85',lineHeight:1.6}}>
                          Using {t} will diversify your AI skills and boost your adoption tier. Even one session counts!
                        </p>
                        <div className="modal-section-title">Open the tool</div>
                        <a
                          href={TOOL_LINKS[t] ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{display:'inline-block',marginTop:8,padding:'8px 18px',background:'#0057b8',color:'#fff',borderRadius:6,textDecoration:'none',fontWeight:600,fontSize:'0.9rem'}}
                        >
                          Open {t} ↗
                        </a>
                      </>
                    )
                  })}>
                    {t} ↗
                  </span>
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

      {/* Modal */}
      {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.content}</Modal>}
    </div>
  )
}
