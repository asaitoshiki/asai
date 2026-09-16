import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Field, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { Chip, ChipRow } from '../../components/Chip'
import { OshiPicker } from '../../components/OshiPicker'
import {
  PHOTO_KINDS,
  PHOTO_KIND_LABEL,
  type ID,
  type Oshi,
  type Photo,
  type PhotoKind,
} from '../../db/schema'
import { removePhoto, updatePhoto } from '../../db/queries'
import { useObjectUrl } from '../../lib/objectUrl'

interface PhotoDetailProps {
  photo: Photo
  oshiList: Oshi[]
  onClose: () => void
}

export function PhotoDetail({ photo, oshiList, onClose }: PhotoDetailProps) {
  const [caption, setCaption] = useState(photo.caption)
  const [kind, setKind] = useState<PhotoKind>(photo.kind)
  const [oshiId, setOshiId] = useState<ID | undefined>(photo.oshiId)
  const [takenOn, setTakenOn] = useState(photo.takenOn)
  const [tags, setTags] = useState(photo.tags.join(' '))
  const [favorite, setFavorite] = useState(photo.favorite)

  const url = useObjectUrl(photo.blob)

  const submit = async () => {
    await updatePhoto(photo.id, {
      caption: caption.trim(),
      kind,
      oshiId,
      takenOn,
      tags: tags.split(/\s+/).filter(Boolean),
      favorite,
    })
    onClose()
  }

  const destroy = async () => {
    if (!confirm('この写真を削除しますか？')) return
    await removePhoto(photo.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="写真"
      footer={<Button onClick={submit}>保存する</Button>}
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl bg-surface-2">
          {url && <img src={url} alt={caption} className="max-h-[50dvh] w-full object-contain" />}
        </div>

        <button
          type="button"
          onClick={() => setFavorite(!favorite)}
          className="w-full rounded-xl border border-line bg-surface-2 py-2.5 text-sm"
        >
          {favorite ? '⭐ お気に入り解除' : '☆ お気に入りに追加'}
        </button>

        <Field label="キャプション">
          <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="ひとこと" />
        </Field>

        <Field label="種類">
          <ChipRow>
            {PHOTO_KINDS.map((value) => (
              <Chip
                key={value}
                label={PHOTO_KIND_LABEL[value]}
                active={kind === value}
                onClick={() => setKind(value)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <Field label="日付">
          <TextInput type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
        </Field>

        <Field label="タグ" hint="スペース区切り">
          <TextInput value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ライブ 特典会" />
        </Field>

        <Button variant="danger" onClick={destroy}>
          この写真を削除
        </Button>
      </div>
    </Sheet>
  )
}
