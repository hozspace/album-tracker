import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Diary', end: true },
  { to: '/log', label: 'Log' },
  { to: '/recs', label: 'Recs' },
  { to: '/settings', label: 'Settings' },
]

export function BottomNav() {
  return (
    <nav className="primary-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            isActive ? 'primary-nav__link primary-nav__link--active' : 'primary-nav__link'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
