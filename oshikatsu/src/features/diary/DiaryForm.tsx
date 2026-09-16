import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/Sheet'
import { Field, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { OshiPicker } from '../../components/OshiPicker'
import { ImageInput } from '../../components/ImageInput'
import { PhotoThumb } from '../../components/PhotoThumb'
import { MOOD_EMOJI, type Diary, type ID, type Mood, type Oshi } from '../../db/schema'
import { addPhoto, getPhotos, removeDiary, saveDiary } from '../../db/queries'
import { cls } from '../../lib/cls'

interface DiaryFormProps {
  diary?: Diary
  defaultDate: string
  oshiList: Oshi[]
  onClose: () => void
}

const MOODS: Mood[] = [1, 2, 3, 4, 5]

export function DiaryForm({ diary, defaultDate, oshiList, onClose }: DiaryFormProps) {
  const [date, setDate] = useState(diary?.date ?? defaultDate)
  const [title, setTitle] = useState(diary?.title ?? '')
  const [body, setBody] = useState(diary?.body ?? '')
  const [mood, setMood] = useState<Mood>(diary?.mood ?? 4)
  const [oshiId, setOshiId] = useState<ID | undefined>(diary?.oshiId)
  const [photoIds, setPhotoIds] = useState<ID[]>(diary?.photoIds ?? [])

  const photos = useLiveQuery(() => getPhotos(photoIds), [photoIds], [])

  const submit = async () => {
    await saveDiary({ date, title: title.trim(), body: body.trim(), mood, oshiId, photoIds }, diary?.id)
    onClose()
  }

  const destroy = async () => {
    if (!diary) return
    if (!confirm('この日記を削除しますか？')) return
    await removeDiary(diary.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={diary ? '日記を編集' : '日記を書く'}
      footer={
        <Button onClick={submit} disabled={!title.trim() && !body.trim()}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="きょうの気分">
          <div className="flex justify-between gap-2">
            {MOODS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMood(value)}
                className={cls(
                  'flex-1 rounded-xl border py-2 text-2xl',
                  mood === value ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2',
                )}
              >
                {MOOD_EMOJI[value]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="タイトル">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="今日のできごと" />
        </Field>

        <Field label="本文">
          <TextArea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <Field label="日付">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                    takenOn: date,
                    oshiId,
                    caption: '',
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

        {diary && (
          <Button variant="danger" onClick={destroy}>
            この日記を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
