import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { getUser, displayName } from '../auth'
import './AppLayout.css'

const menu = [
  { to: '/', label: 'Home', end: true },
  { to: '/work', label: 'Work' },
  { to: '/team', label: 'Team' },
  { to: '/calendar', label: 'Calendar' },
]

export default function AppLayout() {
  const navigate = useNavigate()

  // ยังไม่ล็อกอิน -> ไปหน้า login
  if (!getUser()) return <Navigate to="/login" replace />

  const logout = (e) => {
    e.preventDefault()
    try { localStorage.clear() } catch {}
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__logo">LOGO</div>
        <nav className="sidebar__nav">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' is-active' : '')
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <NavLink to="/settings" className="sidebar__link">Setting</NavLink>
          <a href="/login" className="sidebar__link" onClick={logout}>Log out</a>
        </div>
      </aside>

      <div className="app__body">
        <header className="topbar">
          <span className="topbar__user">{displayName()}</span>
        </header>
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}