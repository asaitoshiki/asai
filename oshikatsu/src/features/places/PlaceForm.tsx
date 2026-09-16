import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/Sheet'
import { Field, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { OshiPicker } from '../../components/OshiPicker'
import { ImageInput } from '../../components/ImageInput'
import { PhotoThumb } from '../../components/PhotoThumb'
import type { ID, Oshi, Place } from '../../db/schema'
import { addPhoto, getPhotos, removePlace, savePlace } from '../../db/queries'
import { todayISO } from '../../lib/date'

interface PlaceFormProps {
  place?: Place
  oshiList: Oshi[]
  onClose: () => void
}

export function PlaceForm({ place, oshiList, onClose }: PlaceFormProps) {
  const [name, setName] = useState(place?.name ?? '')
  const [address, setAddress] = useState(place?.address ?? '')
  const [visitedOn, setVisitedOn] = useState(place?.visitedOn ?? '')
  const [oshiId, setOshiId] = useState<ID | undefined>(place?.oshiId)
  const [memo, setMemo] = useState(place?.memo ?? '')
  const [photoIds, setPhotoIds] = useState<ID[]>(place?.photoIds ?? [])

  const photos = useLiveQuery(() => getPhotos(photoIds), [photoIds], [])

  const submit = async () => {
    await savePlace(
      {
        name: name.trim(),
        address: address.trim(),
        visitedOn: visitedOn || undefined,
        oshiId,
        memo: memo.trim(),
        photoIds,
      },
      place?.id,
    )
    onClose()
  }

  const destroy = async () => {
    if (!place) return
    if (!confirm('この記録を削除しますか？')) return
    await removePlace(place.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={place ? '記録を編集' : '聖地・遠征を記録'}
      footer={
        <Button onClick={submit} disabled={!name.trim()}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="場所の名前">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="会場・ロケ地・カフェ" />
        </Field>

        <Field label="住所・アクセス">
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <Field label="訪れた日">
          <TextInput type="date" value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} />
        </Field>

        <Field label="メモ">
          <TextArea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="行き方、感想、また行きたいところ" />
        </Field>

        <Field label="写真">
          {photos.length > 0 && (
            <div className="mb-2 grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <PhotoThumb
                  key={photo.id}
                  photo={photo}
                  onClick={() => setPhotoIds(photoIds.filter((id) => id !== photo.id))}
                />
              ))}
            </div>
          )}
          <ImageInput
            multiple
            className="block rounded-xl border border-line bg-surface-2 py-2.5 text-center text-sm"
            onPick={async (files) => {
              const ids: ID[] = []
              for (const file of files) {
                ids.push(
                  await addPhoto(file, {
                    kind: 'photo',
                    oshiId,
                    takenOn: visitedOn || todayISO(),
                    caption: name,
                    tags: [],
                    favorite: false,
                  }),
                )
              }
              setPhotoIds([...photoIds, ...ids])
            }}
          >
            写真を追加
          </ImageInput>
        </Field>

        {place && (
          <Button variant="danger" onClick={destroy}>
            この記録を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
