import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Chip, ChipRow } from '../../components/Chip'
import { OshiPicker } from '../../components/OshiPicker'
import { PhotoThumb } from '../../components/PhotoThumb'
import { EmptyState } from '../../components/EmptyState'
import { ImageInput } from '../../components/ImageInput'
import { PhotoDetail } from './PhotoDetail'
import { addPhoto, listOshi, listPhotos } from '../../db/queries'
import { PHOTO_KINDS, PHOTO_KIND_LABEL, type ID, type Photo, type PhotoKind } from '../../db/schema'
import { formatFullDate, todayISO } from '../../lib/date'

export function PhotoGalleryPage() {
  const [oshiId, setOshiId] = useState<ID>()
  const [kind, setKind] = useState<PhotoKind>()
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [opened, setOpened] = useState<Photo>()

  const oshiList = useLiveQuery(listOshi, [], [])
  const photos = useLiveQuery(listPhotos, [], [])

  const filtered = photos.filter(
    (photo) =>
      (!oshiId || photo.oshiId === oshiId) &&
      (!kind || photo.kind === kind) &&
      (!favoriteOnly || photo.favorite),
  )

  // 撮影日ごとにまとめて、新しい日付から並べる
  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>()
    for (const photo of filtered) {
      const list = map.get(photo.takenOn)
      if (list) list.push(photo)
      else map.set(photo.takenOn, [photo])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <AppShell
      title="フォト"
      subtitle={`${filtered.length} 枚`}
      action={
        <ImageInput
          multiple
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-fg"
          onPick={async (files) => {
            for (const file of files) {
              await addPhoto(file, {
                kind: kind ?? 'photo',
                oshiId,
                takenOn: todayISO(),
                caption: '',
                tags: [],
                favorite: false,
              })
            }
          }}
        >
          ＋ 追加
        </ImageInput>
      }
    >
      <div className="space-y-2">
        <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} allLabel="すべての推し" />
        <ChipRow>
          <Chip label="すべて" active={!kind && !favoriteOnly} onClick={() => { setKind(undefined); setFavoriteOnly(false) }} />
          {PHOTO_KINDS.map((value) => (
            <Chip
              key={value}
              label={PHOTO_KIND_LABEL[value]}
              active={kind === value}
              onClick={() => setKind(kind === value ? undefined : value)}
            />
          ))}
          <Chip label="⭐ お気に入り" active={favoriteOnly} onClick={() => setFavoriteOnly(!favoriteOnly)} />
        </ChipRow>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          emoji="📷"
          title="写真がありません"
          hint="右上の「＋ 追加」から、チェキや現場の写真を残せます"
        />
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2 text-xs font-bold text-muted">{formatFullDate(date)}</h2>
              <div className="grid grid-cols-3 gap-2">
                {items.map((photo) => (
                  <PhotoThumb key={photo.id} photo={photo} onClick={() => setOpened(photo)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {opened && (
        <PhotoDetail photo={opened} oshiList={oshiList} onClose={() => setOpened(undefined)} />
      )}
    </AppShell>
  )
}
