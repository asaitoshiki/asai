import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { OshiAvatar } from '../../components/OshiAvatar'
import { PhotoThumb } from '../../components/PhotoThumb'
import { StatTile } from '../../components/StatTile'
import { Icon, type IconName } from '../../components/Icon'
import { db } from '../../db/db'
import { listOshi } from '../../db/queries'
import { expandOccurrences } from '../../lib/calendar'
import {
  addDays,
  daysSinceStart,
  daysUntil,
  formatDate,
  formatFullDate,
  monthEnd,
  monthKey,
  monthStart,
  todayISO,
} from '../../lib/date'
import { formatNumber, formatYen } from '../../lib/money'

const SHORTCUTS: { to: string; label: string; icon: IconName }[] = [
  { to: '/goods', label: 'グッズ', icon: 'bag' },
  { to: '/diary', label: '日記', icon: 'book' },
  { to: '/places', label: '聖地・遠征', icon: 'pin' },
  { to: '/settings', label: '設定', icon: 'gear' },
]

export function HomePage() {
  const today = todayISO()
  const horizon = addDays(today, 400)
  const thisMonth = monthKey(today)

  const oshiList = useLiveQuery(listOshi, [], [])
  // 繰り返しの記念日も拾うため、予定は全件読んで展開側で絞る
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').reverse().limit(6).toArray(), [], [])
  const photoCount = useLiveQuery(() => db.photos.count(), [], 0)
  const expenses = useLiveQuery(
    () => db.expenses.where('date').between(monthStart(thisMonth), monthEnd(thisMonth), true, true).toArray(),
    [thisMonth],
    [],
  )

  const upcoming = useMemo(
    () => expandOccurrences(events, oshiList, today, horizon).filter((item) => !item.done),
    [events, oshiList, today, horizon],
  )

  const todays = upcoming.filter((item) => item.date === today)
  const next = upcoming.find((item) => item.date > today)
  const monthTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <AppShell title="推し活ノート" subtitle={formatFullDate(today)}>
      <div className="space-y-6">
        {next && (
          <section
            className="card overflow-hidden p-5 text-center"
            style={next.color ? { borderColor: next.color } : undefined}
          >
            <p className="text-xs text-muted">つぎの予定まで</p>
            <p className="my-1 text-5xl font-bold tabular-nums" style={{ color: next.color ?? 'var(--c-accent)' }}>
              {daysUntil(next.date)}
              <span className="ml-1 text-base font-medium text-muted">日</span>
            </p>
            <p className="font-bold">
              {next.emoji} {next.title}
            </p>
            <p className="text-xs text-muted">{formatDate(next.date)}</p>
          </section>
        )}

        {todays.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">今日の予定</h2>
            <ul className="space-y-2">
              {todays.map((occurrence) => (
                <li key={occurrence.key} className="card flex items-center gap-3 p-3">
                  <span className="text-lg">{occurrence.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{occurrence.title}</p>
                    <p className="truncate text-xs text-muted">
                      {[occurrence.startTime, occurrence.venue].filter(Boolean).join(' ・ ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">マイ推し</h2>
            <Link to="/oshi" className="text-xs text-accent">
              一覧
            </Link>
          </div>
          {oshiList.length === 0 ? (
            <Link to="/oshi" className="card flex items-center justify-between p-4 text-sm">
              <span>まずは推しを登録しましょう 💖</span>
              <Icon name="next" className="size-4 text-muted" />
            </Link>
          ) : (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1">
              {oshiList.map((oshi) => (
                <Link
                  key={oshi.id}
                  to={`/oshi/${oshi.id}`}
                  className="card flex w-28 shrink-0 flex-col items-center gap-2 p-3 text-center"
                >
                  <OshiAvatar oshi={oshi} size={56} />
                  <p className="w-full truncate text-xs font-bold">{oshi.name}</p>
                  {oshi.startedOn && (
                    <p className="text-[10px] text-muted">{daysSinceStart(oshi.startedOn)}日目</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-3 gap-2">
          <StatTile label="今月の支出" value={formatYen(monthTotal)} />
          <StatTile label="これからの予定" value={formatNumber(upcoming.length)} unit="件" />
          <StatTile label="写真" value={formatNumber(photoCount)} unit="枚" />
        </section>

        {photos.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">さいきんの写真</h2>
              <Link to="/photos" className="text-xs text-accent">
                すべて見る
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} />
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-4 gap-2">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="card flex flex-col items-center gap-1 py-3 text-[11px]"
            >
              <Icon name={shortcut.icon} className="size-5 text-accent" />
              {shortcut.label}
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  )
}
