import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { cls } from '../lib/cls'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/calendar', label: 'カレンダー', icon: 'calendar' },
  { to: '/photos', label: 'フォト', icon: 'photo' },
  { to: '/expenses', label: '支出', icon: 'wallet' },
  { to: '/oshi', label: '推し', icon: 'heart' },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                cls(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={tab.icon} className="size-6" filled={isActive && tab.icon === 'heart'} />
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
