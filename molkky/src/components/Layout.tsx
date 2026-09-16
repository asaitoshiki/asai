import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'ホーム', icon: '🎯' },
  { to: '/tournaments', label: '大会', icon: '🏆' },
  { to: '/stats', label: '戦績', icon: '📊' },
  { to: '/members', label: 'メンバー', icon: '👥' },
  { to: '/rules', label: 'ルール', icon: '📖' },
]

/** 下タブ付きの共通レイアウト。試合画面だけはタブを隠して集中できるようにする。 */
export const Layout = () => (
  <div className="mx-auto flex min-h-full max-w-md flex-col">
    <main className="safe-top flex-1 px-4 pt-4 pb-28">
      <Outlet />
    </main>
    <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <ul className="flex">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`
              }
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  </div>
)
