import { useState } from 'react'
import CoEDashboard          from './pages/CoEDashboard.jsx'
import PracticeLeadDashboard from './pages/PracticeLeadDashboard.jsx'
import ConsultantDashboard   from './pages/ConsultantDashboard.jsx'
import LogSession            from './pages/LogSession.jsx'
import './App.css'

// Role switcher for demo — represents "Test User" as the default current user
const DEMO_USERS = [
  { id: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', name: 'Test User (You) — ENR-APAC', role: 'Consultant'    },
  { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',  name: 'Sunita Rao — APAC Lead',     role: 'PracticeLead'  },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'James Okafor — ENR-North',   role: 'PracticeLead'  },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Sarah Chen — CoE',           role: 'CoELeadership' },
  { id: 'tttttttt-tttt-tttt-tttt-tttttttttttt', name: 'Alex Turner (Admin)',        role: 'Admin'         },
]

export default function App() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0])
  const [activePage,  setActivePage]  = useState('self')

  const role = currentUser.role

  const navItems = [
    role === 'CoELeadership' || role === 'Admin'
      ? { key: 'coe',      label: 'CoE Leadership' }
      : null,
    role === 'PracticeLead' || role === 'Admin'
      ? { key: 'lead',     label: 'Practice Lead'  }
      : null,
    role === 'Consultant' || role === 'Admin'
      ? { key: 'self',     label: 'My Dashboard'   }
      : null,
    role === 'Consultant' || role === 'Admin'
      ? { key: 'log',      label: 'Log Session'    }
      : null,
    // Admin sees everything
    role === 'Admin'
      ? { key: 'coe',  label: 'CoE View'  } : null,
    role === 'Admin'
      ? { key: 'lead', label: 'Lead View' } : null,
  ].filter(Boolean)

  // Default to first available page when user switches role
  function switchUser(user) {
    setCurrentUser(user)
    const r = user.role
    if (r === 'CoELeadership') setActivePage('coe')
    else if (r === 'PracticeLead') setActivePage('lead')
    else setActivePage('self')
  }

  return (
    <div className="app">
      {/* Shell Bar */}
      <header className="shell-bar">
        <div className="shell-logo">
          <span className="shell-logo-icon">🤖</span>
          <span className="shell-title">AI Adoption Tracker</span>
          <span className="shell-subtitle">ENR Practice</span>
        </div>
        <nav className="shell-nav">
          {[...new Map(navItems.map(n => [n.key, n])).values()].map(item => (
            <button
              key={item.key}
              className={`nav-btn ${activePage === item.key ? 'nav-btn--active' : ''}`}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shell-user">
          <select
            value={currentUser.id}
            onChange={e => switchUser(DEMO_USERS.find(u => u.id === e.target.value))}
            className="user-switcher"
            title="Switch demo user"
          >
            {DEMO_USERS.map(u => (
              <option key={u.id} value={u.id}>👤 {u.name} ({u.role})</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activePage === 'coe'  && <CoEDashboard />}
        {activePage === 'lead' && <PracticeLeadDashboard currentUser={currentUser} />}
        {activePage === 'self' && <ConsultantDashboard />}
        {activePage === 'log'  && <LogSession />}
      </main>
    </div>
  )
}
