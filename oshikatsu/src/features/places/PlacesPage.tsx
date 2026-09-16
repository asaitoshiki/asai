import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Fab } from '../../components/Fab'
import { EmptyState } from '../../components/EmptyState'
import { OshiPicker } from '../../components/OshiPicker'
import { PlaceForm } from './PlaceForm'
import { listOshi, listPlaces } from '../../db/queries'
import type { ID, Place } from '../../db/schema'
import { formatFullDate } from '../../lib/date'

export function PlacesPage() {
  const [oshiId, setOshiId] = useState<ID>()
  const [editing, setEditing] = useState<Place | 'new'>()

  const oshiList = useLiveQuery(listOshi, [], [])
  const places = useLiveQuery(listPlaces, [], [])

  const filtered = places.filter((place) => !oshiId || place.oshiId === oshiId)

  return (
    <AppShell title="聖地・遠征" back>
      <div className="space-y-4">
        <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} allLabel="すべての推し" />

        {filtered.length === 0 ? (
          <EmptyState emoji="📍" title="まだ記録がありません" hint="行った会場やロケ地を残しておけます" />
        ) : (
          <ul className="space-y-3">
            {filtered.map((place) => {
              const oshi = oshiList.find((item) => item.id === place.oshiId)
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(place)}
                    className="card w-full p-4 text-left"
                    style={oshi ? { borderLeft: `4px solid ${oshi.color}` } : undefined}
                  >
                    <p className="font-bold">📍 {place.name}</p>
                    {place.address && <p className="mt-0.5 text-xs text-muted">{place.address}</p>}
                    {place.visitedOn && (
                      <p className="mt-1 text-xs text-muted">{formatFullDate(place.visitedOn)}</p>
                    )}
                    {place.memo && (
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted">{place.memo}</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Fab label="聖地を記録" onClick={() => setEditing('new')} />

      {editing && (
        <PlaceForm
          place={editing === 'new' ? undefined : editing}
          oshiList={oshiList}
          onClose={() => setEditing(undefined)}
        />
      )}
    </AppShell>
  )
}
