import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Fab } from '../../components/Fab'
import { EmptyState } from '../../components/EmptyState'
import { OshiPicker } from '../../components/OshiPicker'
import { DiaryForm } from './DiaryForm'
import { listDiaries, listOshi } from '../../db/queries'
import { MOOD_EMOJI, type Diary, type ID } from '../../db/schema'
import { formatFullDate, todayISO } from '../../lib/date'

export function DiaryPage() {
  const [oshiId, setOshiId] = useState<ID>()
  const [editing, setEditing] = useState<Diary | 'new'>()

  const oshiList = useLiveQuery(listOshi, [], [])
  const diaries = useLiveQuery(listDiaries, [], [])

  const filtered = diaries.filter((diary) => !oshiId || diary.oshiId === oshiId)

  return (
    <AppShell title="日記" back>
      <div className="space-y-4">
        <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} allLabel="すべての推し" />

        {filtered.length === 0 ? (
          <EmptyState emoji="📔" title="まだ日記がありません" hint="現場の記憶が新しいうちに残しましょう" />
        ) : (
          <ul className="space-y-3">
            {filtered.map((diary) => {
              const oshi = oshiList.find((item) => item.id === diary.oshiId)
              return (
                <li key={diary.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(diary)}
                    className="card w-full p-4 text-left"
                    style={oshi ? { borderLeft: `4px solid ${oshi.color}` } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted">{formatFullDate(diary.date)}</p>
                      <span className="text-lg">{MOOD_EMOJI[diary.mood]}</span>
                    </div>
                    <p className="mt-1 font-bold">{diary.title || '無題'}</p>
                    {diary.body && (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{diary.body}</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Fab label="日記を書く" onClick={() => setEditing('new')} />

      {editing && (
        <DiaryForm
          diary={editing === 'new' ? undefined : editing}
          defaultDate={todayISO()}
          oshiList={oshiList}
          onClose={() => setEditing(undefined)}
        />
      )}
    </AppShell>
  )
}
