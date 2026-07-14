import { NavLink } from 'react-router'
import { DiaryIcon, LogIcon, RecsIcon, SettingsIcon } from './BottomNavIcons'

const NAV_ITEMS = [
  { to: '/', label: 'Diary', end: true, Icon: DiaryIcon },
  { to: '/log', label: 'Log', Icon: LogIcon },
  { to: '/recs', label: 'Recs', Icon: RecsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function BottomNav() {
  return (
    <nav className="primary-nav">
      {NAV_ITEMS.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            isActive ? 'primary-nav__link primary-nav__link--active' : 'primary-nav__link'
          }
        >
          <span className="primary-nav__icon">
            <Icon />
          </span>
          <span className="primary-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
