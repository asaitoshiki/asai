import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Icon } from './Icon'

interface AppShellProps {
  title: string
  children: ReactNode
  /** 戻るボタンを出す（下部タブは隠れる） */
  back?: boolean
  action?: ReactNode
  subtitle?: string
}

export function AppShell({ title, children, back = false, action, subtitle }: AppShellProps) {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          {back && (
            <button type="button" onClick={() => navigate(-1)} aria-label="戻る" className="-ml-2 p-1">
              <Icon name="back" className="size-6" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {!back && <BottomNav />}
    </div>
  )
}
