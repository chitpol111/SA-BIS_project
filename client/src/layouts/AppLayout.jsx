import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

const menu = [
  { to: '/', label: 'Home', end: true },
  { to: '/work', label: 'Work' },
  { to: '/team', label: 'Team' },
  { to: '/calendar', label: 'Calendar' },
]

export default function AppLayout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__logo">LOGO</div>
        <nav className="sidebar__nav">
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.end}
              className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <NavLink to="/settings" className="sidebar__link">Setting</NavLink>
          <NavLink to="/login" className="sidebar__link">Log out</NavLink>
        </div>
      </aside>

      <div className="app__body">
        <header className="topbar">
          <span className="topbar__user">ชื่อผู้ใช้</span>
        </header>
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}