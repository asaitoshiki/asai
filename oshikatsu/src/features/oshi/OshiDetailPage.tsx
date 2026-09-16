import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { OshiAvatar } from '../../components/OshiAvatar'
import { StatTile } from '../../components/StatTile'
import { PhotoThumb } from '../../components/PhotoThumb'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/EmptyState'
import { OshiForm } from './OshiForm'
import { db } from '../../db/db'
import { getOshi, listPhotosOfOshi } from '../../db/queries'
import { EVENT_TYPE_EMOJI } from '../../db/schema'
import { daysSinceStart, daysUntil, formatDate, nextAnnual, todayISO } from '../../lib/date'
import { formatNumber, formatYen } from '../../lib/money'

export function OshiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)

  const oshi = useLiveQuery(() => getOshi(id!), [id])
  const photos = useLiveQuery(() => listPhotosOfOshi(id!), [id], [])
  const expenses = useLiveQuery(() => db.expenses.where('oshiId').equals(id!).toArray(), [id], [])
  const upcoming = useLiveQuery(
    () =>
      db.events
        .where('oshiId')
        .equals(id!)
        .filter((event) => event.date >= todayISO())
        .sortBy('date'),
    [id],
    [],
  )

  if (!oshi) return null

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <AppShell
      title={oshi.name}
      subtitle={oshi.groupName || undefined}
      back
      action={
        <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-accent">
          編集
        </button>
      }
    >
      <div className="space-y-5">
        <div className="card flex items-center gap-4 p-4">
          <OshiAvatar oshi={oshi} size={72} />
          <div className="min-w-0 flex-1 space-y-1">
            {oshi.startedOn && (
              <p className="text-sm">
                推して <span className="text-xl font-bold tabular-nums">{formatNumber(daysSinceStart(oshi.startedOn))}</span> 日目
              </p>
            )}
            {oshi.birthday && (
              <p className="text-sm text-muted">
                🎂 {Number(oshi.birthday.slice(0, 2))}/{Number(oshi.birthday.slice(3, 5))} ・ あと
                {daysUntil(nextAnnual(oshi.birthday))}日
              </p>
            )}
            <Link
              to={`/oshi/${oshi.id}/penlight`}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs"
            >
              <Icon name="light" className="size-4" />
              ペンライト
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="使った金額" value={formatYen(total)} />
          <StatTile label="写真" value={photos.length} unit="枚" />
          <StatTile label="これからの予定" value={upcoming.length} unit="件" />
        </div>

        {oshi.memo && (
          <section className="card whitespace-pre-wrap p-4 text-sm leading-relaxed">{oshi.memo}</section>
        )}

        {oshi.links.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">リンク</h2>
            <ul className="space-y-2">
              {oshi.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="card flex items-center justify-between gap-2 p-3 text-sm"
                  >
                    <span className="truncate">{link.label || link.url}</span>
                    <Icon name="next" className="size-4 shrink-0 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold">これからの予定</h2>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">まだ予定がありません</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 5).map((event) => (
                <li key={event.id} className="card flex items-center gap-3 p-3">
                  <span className="text-lg">{EVENT_TYPE_EMOJI[event.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted">{formatDate(event.date)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold" style={{ color: oshi.color }}>
                    あと{daysUntil(event.date)}日
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">写真</h2>
            <Link to="/photos" className="text-xs text-accent">
              すべて見る
            </Link>
          </div>
          {photos.length === 0 ? (
            <EmptyState emoji="📷" title="まだ写真がありません" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 9).map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} />
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && <OshiForm oshi={oshi} nextSortOrder={oshi.sortOrder} onClose={() => setEditing(false)} />}
    </AppShell>
  )
}
