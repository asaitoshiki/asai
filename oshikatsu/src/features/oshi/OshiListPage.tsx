import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Fab } from '../../components/Fab'
import { EmptyState } from '../../components/EmptyState'
import { OshiAvatar } from '../../components/OshiAvatar'
import { Icon } from '../../components/Icon'
import { OshiForm } from './OshiForm'
import { listOshi } from '../../db/queries'
import type { Oshi } from '../../db/schema'
import { daysSinceStart, daysUntil, nextAnnual } from '../../lib/date'

export function OshiListPage() {
  const oshiList = useLiveQuery(listOshi, [], [] as Oshi[])
  const [editing, setEditing] = useState<Oshi | 'new'>()

  return (
    <AppShell title="マイ推し">
      {oshiList.length === 0 ? (
        <EmptyState
          emoji="💖"
          title="まだ推しが登録されていません"
          hint="右下のボタンから追加すると、誕生日が毎年カレンダーに出るようになります"
        />
      ) : (
        <ul className="space-y-3">
          {oshiList.map((oshi) => (
            <li key={oshi.id}>
              <Link to={`/oshi/${oshi.id}`} className="card flex items-center gap-3 p-3">
                <OshiAvatar oshi={oshi} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{oshi.name}</p>
                  {oshi.groupName && <p className="truncate text-xs text-muted">{oshi.groupName}</p>}
                  <p className="mt-0.5 text-xs" style={{ color: oshi.color }}>
                    {oshi.startedOn && `推して ${daysSinceStart(oshi.startedOn)} 日目`}
                    {oshi.startedOn && oshi.birthday && ' ・ '}
                    {oshi.birthday && `お誕生日まで ${daysUntil(nextAnnual(oshi.birthday))} 日`}
                  </p>
                </div>
                <Icon name="next" className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Fab label="推しを追加" onClick={() => setEditing('new')} />

      {editing && (
        <OshiForm
          oshi={editing === 'new' ? undefined : editing}
          nextSortOrder={oshiList.length}
          onClose={() => setEditing(undefined)}
        />
      )}
    </AppShell>
  )
}
