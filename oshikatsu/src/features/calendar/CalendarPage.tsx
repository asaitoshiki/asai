import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { MonthGrid } from './MonthGrid'
import { DaySheet } from './DaySheet'
import { EventForm } from './EventForm'
import { ExpenseForm } from '../expenses/ExpenseForm'
import { DiaryForm } from '../diary/DiaryForm'
import { PhotoDetail } from '../photos/PhotoDetail'
import { db } from '../../db/db'
import { listEventsInRange, listOshi } from '../../db/queries'
import type { ID, Photo } from '../../db/schema'
import { expandOccurrences, groupByDate } from '../../lib/calendar'
import {
  WEEKDAY_LABELS,
  addMonths,
  formatMonth,
  fromISO,
  monthEnd,
  monthKey,
  monthStart,
  todayISO,
} from '../../lib/date'

/** 開いているフォームの種類。同時に 1 つだけ開く */
type OpenForm =
  | { kind: 'event'; id?: ID }
  | { kind: 'expense'; id?: ID }
  | { kind: 'diary'; id?: ID }
  | { kind: 'photo'; photo: Photo }

export function CalendarPage() {
  const today = todayISO()
  const [month, setMonth] = useState(monthKey(today))
  const [selected, setSelected] = useState<string>()
  const [form, setForm] = useState<OpenForm>()

  const from = monthStart(month)
  const to = monthEnd(month)
  // グリッドは前後の月の日も表示するので、前後 1 週間ぶん広く取る
  const gridFrom = addMonths(from, -1)
  const gridTo = addMonths(to, 1)

  const oshiList = useLiveQuery(listOshi, [], [])
  const events = useLiveQuery(() => listEventsInRange(gridFrom, gridTo), [gridFrom, gridTo], [])
  const monthPhotos = useLiveQuery(
    () => db.photos.where('takenOn').between(gridFrom, gridTo, true, true).toArray(),
    [gridFrom, gridTo],
    [],
  )
  const monthExpenses = useLiveQuery(
    () => db.expenses.where('date').between(gridFrom, gridTo, true, true).toArray(),
    [gridFrom, gridTo],
    [],
  )
  const monthDiaries = useLiveQuery(
    () => db.diaries.where('date').between(gridFrom, gridTo, true, true).toArray(),
    [gridFrom, gridTo],
    [],
  )

  const occurrences = useMemo(
    () => groupByDate(expandOccurrences(events, oshiList, gridFrom, gridTo)),
    [events, oshiList, gridFrom, gridTo],
  )

  // 各日の代表写真（その日の最初の 1 枚）をマス背景に使う
  const photoByDate = useMemo(() => {
    const map = new Map<string, Photo>()
    for (const photo of monthPhotos) {
      if (!map.has(photo.takenOn)) map.set(photo.takenOn, photo)
    }
    return map
  }, [monthPhotos])

  const monthOccurrences = useMemo(
    () => [...occurrences.values()].flat().filter((item) => monthKey(item.date) === month),
    [occurrences, month],
  )

  const monthTotal = monthExpenses
    .filter((expense) => monthKey(expense.date) === month)
    .reduce((sum, expense) => sum + expense.amount, 0)

  const selectedEvent =
    form?.kind === 'event' && form.id ? events.find((event) => event.id === form.id) : undefined
  const selectedExpense =
    form?.kind === 'expense' && form.id ? monthExpenses.find((item) => item.id === form.id) : undefined
  const selectedDiary =
    form?.kind === 'diary' && form.id ? monthDiaries.find((item) => item.id === form.id) : undefined

  return (
    <AppShell
      title={formatMonth(month)}
      subtitle={monthTotal > 0 ? `今月の支出 ¥${monthTotal.toLocaleString('ja-JP')}` : undefined}
      action={
        <div className="flex items-center gap-1">
          <button type="button" aria-label="前の月" onClick={() => setMonth(monthKey(addMonths(from, -1)))}>
            <Icon name="back" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthKey(today))}
            className="rounded-full border border-line px-2.5 py-1 text-xs"
          >
            今日
          </button>
          <button type="button" aria-label="次の月" onClick={() => setMonth(monthKey(addMonths(from, 1)))}>
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <MonthGrid
        month={month}
        occurrences={occurrences}
        photos={photoByDate}
        selected={selected ?? ''}
        onSelect={setSelected}
      />

      <section className="mt-5 space-y-2">
        <h2 className="text-sm font-bold">{formatMonth(month)}の予定</h2>
        {monthOccurrences.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">
            日付をタップすると、その日の予定・写真・支出を追加できます
          </p>
        ) : (
          <ul className="space-y-2">
            {monthOccurrences.map((occurrence) => (
              <li key={occurrence.key}>
                <button
                  type="button"
                  onClick={() => setSelected(occurrence.date)}
                  className="card flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="w-9 shrink-0 text-center">
                    <span className="block text-base font-bold tabular-nums">
                      {Number(occurrence.date.slice(8))}
                    </span>
                    <span className="block text-[10px] text-muted">
                      {WEEKDAY_LABELS[fromISO(occurrence.date).getDay()]}
                    </span>
                  </span>
                  <span className="text-lg">{occurrence.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{occurrence.title}</p>
                    <p className="truncate text-xs text-muted">
                      {[occurrence.startTime, occurrence.venue].filter(Boolean).join(' ・ ')}
                    </p>
                  </div>
                  {occurrence.color && (
                    <span
                      style={{ backgroundColor: occurrence.color }}
                      className="size-2.5 shrink-0 rounded-full"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && !form && (
        <DaySheet
          date={selected}
          occurrences={occurrences.get(selected) ?? []}
          photos={monthPhotos.filter((photo) => photo.takenOn === selected)}
          expenses={monthExpenses.filter((expense) => expense.date === selected)}
          diaries={monthDiaries.filter((diary) => diary.date === selected)}
          onClose={() => setSelected(undefined)}
          onAddEvent={() => setForm({ kind: 'event' })}
          onEditEvent={(id) => setForm({ kind: 'event', id })}
          onAddExpense={() => setForm({ kind: 'expense' })}
          onEditExpense={(id) => setForm({ kind: 'expense', id })}
          onAddDiary={() => setForm({ kind: 'diary' })}
          onEditDiary={(id) => setForm({ kind: 'diary', id })}
          onOpenPhoto={(photo) => setForm({ kind: 'photo', photo })}
        />
      )}

      {form?.kind === 'event' && (
        <EventForm
          event={selectedEvent}
          defaultDate={selected ?? today}
          oshiList={oshiList}
          onClose={() => setForm(undefined)}
        />
      )}
      {form?.kind === 'expense' && (
        <ExpenseForm
          expense={selectedExpense}
          defaultDate={selected ?? today}
          oshiList={oshiList}
          onClose={() => setForm(undefined)}
        />
      )}
      {form?.kind === 'diary' && (
        <DiaryForm
          diary={selectedDiary}
          defaultDate={selected ?? today}
          oshiList={oshiList}
          onClose={() => setForm(undefined)}
        />
      )}
      {form?.kind === 'photo' && (
        <PhotoDetail photo={form.photo} oshiList={oshiList} onClose={() => setForm(undefined)} />
      )}
    </AppShell>
  )
}
