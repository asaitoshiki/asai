import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Field, Select, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { ColorPicker } from '../../components/ColorPicker'
import { ImageInput } from '../../components/ImageInput'
import { OSHI_COLORS, type Link, type Oshi } from '../../db/schema'
import { removeOshi, saveOshi } from '../../db/queries'
import { processImage } from '../../lib/image'
import { useObjectUrl } from '../../lib/objectUrl'

interface OshiFormProps {
  oshi?: Oshi
  nextSortOrder: number
  onClose: () => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const pad = (value: number) => String(value).padStart(2, '0')

export function OshiForm({ oshi, nextSortOrder, onClose }: OshiFormProps) {
  const [name, setName] = useState(oshi?.name ?? '')
  const [kana, setKana] = useState(oshi?.kana ?? '')
  const [groupName, setGroupName] = useState(oshi?.groupName ?? '')
  const [color, setColor] = useState(oshi?.color ?? OSHI_COLORS[0])
  const [avatar, setAvatar] = useState<Blob | undefined>(oshi?.avatar)
  const [birthMonth, setBirthMonth] = useState(oshi?.birthday?.slice(0, 2) ?? '')
  const [birthDay, setBirthDay] = useState(oshi?.birthday?.slice(3, 5) ?? '')
  const [birthYear, setBirthYear] = useState(oshi?.birthYear ? String(oshi.birthYear) : '')
  const [startedOn, setStartedOn] = useState(oshi?.startedOn ?? '')
  const [memo, setMemo] = useState(oshi?.memo ?? '')
  const [links, setLinks] = useState<Link[]>(oshi?.links ?? [])

  const avatarUrl = useObjectUrl(avatar)
  const birthday = birthMonth && birthDay ? `${birthMonth}-${birthDay}` : undefined

  const submit = async () => {
    await saveOshi(
      {
        name: name.trim(),
        kana: kana.trim(),
        groupName: groupName.trim(),
        color,
        avatar,
        birthday,
        birthYear: birthYear ? Number(birthYear) : undefined,
        startedOn: startedOn || undefined,
        memo: memo.trim(),
        links: links.filter((link) => link.url.trim()),
        sortOrder: oshi?.sortOrder ?? nextSortOrder,
      },
      oshi?.id,
    )
    onClose()
  }

  const destroy = async () => {
    if (!oshi) return
    if (!confirm(`${oshi.name} を削除しますか？\n（写真や支出の記録は残り、推しの紐付けだけ外れます）`)) return
    await removeOshi(oshi.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={oshi ? '推しを編集' : '推しを追加'}
      footer={
        <Button onClick={submit} disabled={!name.trim()}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            style={{ borderColor: color }}
            className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span style={{ color }} className="text-3xl font-bold">
                {name.slice(0, 1) || '推'}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <ImageInput
              className="inline-block rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
              onPick={async ([file]) => {
                const processed = await processImage(file)
                setAvatar(processed.thumb)
              }}
            >
              画像を選ぶ
            </ImageInput>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar(undefined)}
                className="block text-xs text-muted underline"
              >
                画像を外す
              </button>
            )}
          </div>
        </div>

        <Field label="名前">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="推しの名前" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="よみがな">
            <TextInput value={kana} onChange={(e) => setKana(e.target.value)} />
          </Field>
          <Field label="グループ・作品">
            <TextInput value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </Field>
        </div>

        <Field label="メンバーカラー" hint="カレンダーのドットやペンライト画面に使われます">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        <Field label="誕生日" hint="毎年カレンダーに自動で表示されます">
          <div className="flex items-center gap-2">
            <Select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
              <option value="">--</option>
              {MONTHS.map((month) => (
                <option key={month} value={pad(month)}>
                  {month}
                </option>
              ))}
            </Select>
            <span className="shrink-0 text-sm text-muted">月</span>
            <Select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>
              <option value="">--</option>
              {DAYS.map((day) => (
                <option key={day} value={pad(day)}>
                  {day}
                </option>
              ))}
            </Select>
            <span className="shrink-0 text-sm text-muted">日</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="生まれ年" hint="任意">
            <TextInput
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2000"
            />
          </Field>
          <Field label="推し始めた日">
            <TextInput type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
          </Field>
        </div>

        <Field label="メモ">
          <TextArea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="好きなところ、はじめて知ったきっかけ…" />
        </Field>

        <Field label="リンク" hint="公式サイト・SNS など">
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <TextInput
                  value={link.label}
                  placeholder="X"
                  onChange={(e) =>
                    setLinks(links.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))
                  }
                />
                <TextInput
                  value={link.url}
                  placeholder="https://"
                  inputMode="url"
                  onChange={(e) =>
                    setLinks(links.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)))
                  }
                />
                <button
                  type="button"
                  aria-label="リンクを削除"
                  onClick={() => setLinks(links.filter((_, i) => i !== index))}
                  className="shrink-0 px-2 text-muted"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLinks([...links, { label: '', url: '' }])}
              className="text-sm text-accent"
            >
              ＋ リンクを追加
            </button>
          </div>
        </Field>

        {oshi && (
          <Button variant="danger" onClick={destroy}>
            この推しを削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
