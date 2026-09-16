import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '../../components/Sheet'
import { Field, Select, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { OshiPicker } from '../../components/OshiPicker'
import { ImageInput } from '../../components/ImageInput'
import { PhotoThumb } from '../../components/PhotoThumb'
import {
  GOODS_CATEGORIES,
  GOODS_CATEGORY_LABEL,
  type Goods,
  type GoodsCategory,
  type ID,
  type Oshi,
} from '../../db/schema'
import { addPhoto, getPhoto, removeGoods, saveGoods } from '../../db/queries'
import { todayISO } from '../../lib/date'

interface GoodsFormProps {
  goods?: Goods
  oshiList: Oshi[]
  onClose: () => void
}

export function GoodsForm({ goods, oshiList, onClose }: GoodsFormProps) {
  const [name, setName] = useState(goods?.name ?? '')
  const [category, setCategory] = useState<GoodsCategory>(goods?.category ?? 'acrylic')
  const [count, setCount] = useState(String(goods?.count ?? 1))
  const [acquiredOn, setAcquiredOn] = useState(goods?.acquiredOn ?? '')
  const [oshiId, setOshiId] = useState<ID | undefined>(goods?.oshiId)
  const [photoId, setPhotoId] = useState<ID | undefined>(goods?.photoId)
  const [memo, setMemo] = useState(goods?.memo ?? '')

  const photo = useLiveQuery(() => (photoId ? getPhoto(photoId) : undefined), [photoId])

  const submit = async () => {
    await saveGoods(
      {
        name: name.trim(),
        category,
        count: Number(count) || 1,
        acquiredOn: acquiredOn || undefined,
        oshiId,
        photoId,
        memo: memo.trim(),
      },
      goods?.id,
    )
    onClose()
  }

  const destroy = async () => {
    if (!goods) return
    if (!confirm('このグッズを削除しますか？')) return
    await removeGoods(goods.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={goods ? 'グッズを編集' : 'グッズを追加'}
      footer={
        <Button onClick={submit} disabled={!name.trim()}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="写真">
          <div className="flex items-center gap-3">
            {photo && <PhotoThumb photo={photo} className="w-24" />}
            <ImageInput
              className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
              onPick={async ([file]) => {
                setPhotoId(
                  await addPhoto(file, {
                    kind: 'goods',
                    oshiId,
                    takenOn: acquiredOn || todayISO(),
                    caption: name,
                    tags: [],
                    favorite: false,
                  }),
                )
              }}
            >
              画像を選ぶ
            </ImageInput>
          </div>
        </Field>

        <Field label="グッズ名">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="アクリルスタンド" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="種類">
            <Select value={category} onChange={(e) => setCategory(e.target.value as GoodsCategory)}>
              {GOODS_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {GOODS_CATEGORY_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="個数">
            <TextInput
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <Field label="入手日">
          <TextInput type="date" value={acquiredOn} onChange={(e) => setAcquiredOn(e.target.value)} />
        </Field>

        <Field label="メモ">
          <TextArea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>

        {goods && (
          <Button variant="danger" onClick={destroy}>
            このグッズを削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
