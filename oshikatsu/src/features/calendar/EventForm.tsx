import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Field, Select, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { OshiPicker } from '../../components/OshiPicker'
import { EVENT_TYPES, EVENT_TYPE_LABEL, type ID, type Oshi, type OshiEvent } from '../../db/schema'
import { removeEvent, saveEvent } from '../../db/queries'

interface EventFormProps {
  event?: OshiEvent
  defaultDate: string
  oshiList: Oshi[]
  onClose: () => void
}

export function EventForm({ event, defaultDate, oshiList, onClose }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [type, setType] = useState(event?.type ?? 'live')
  const [oshiId, setOshiId] = useState<ID | undefined>(event?.oshiId)
  const [date, setDate] = useState(event?.date ?? defaultDate)
  const [endDate, setEndDate] = useState(event?.endDate ?? '')
  const [startTime, setStartTime] = useState(event?.startTime ?? '')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [memo, setMemo] = useState(event?.memo ?? '')
  const [repeatYearly, setRepeatYearly] = useState(event?.repeatYearly ?? false)

  const submit = async () => {
    await saveEvent(
      {
        title: title.trim(),
        type,
        oshiId,
        date,
        endDate: endDate && endDate > date ? endDate : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        venue: venue.trim(),
        memo: memo.trim(),
        repeatYearly,
        done: event?.done ?? false,
      },
      event?.id,
    )
    onClose()
  }

  const destroy = async () => {
    if (!event) return
    if (!confirm('この予定を削除しますか？')) return
    await removeEvent(event.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={event ? '予定を編集' : '予定を追加'}
      footer={
        <Button onClick={submit} disabled={!title.trim()}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="タイトル">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ワンマンライブ、リリイベ…"
          />
        </Field>

        <Field label="種類">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {EVENT_TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="日付">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="終了日" hint="複数日のとき">
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="開始時刻">
            <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="終了時刻">
            <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <Field label="場所">
          <TextInput value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="会場・配信先" />
        </Field>

        <Field label="メモ">
          <TextArea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>

        <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-3">
          <input
            type="checkbox"
            checked={repeatYearly}
            onChange={(e) => setRepeatYearly(e.target.checked)}
            className="size-5 accent-[var(--c-accent)]"
          />
          <span className="text-sm">毎年くりかえす（記念日）</span>
        </label>

        {event && (
          <Button variant="danger" onClick={destroy}>
            この予定を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
