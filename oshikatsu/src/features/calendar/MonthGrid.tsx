import type { Photo } from '../../db/schema'
import type { Occurrence } from '../../lib/calendar'
import { WEEKDAY_LABELS, monthGrid, monthKey, todayISO } from '../../lib/date'
import { useObjectUrl } from '../../lib/objectUrl'
import { cls } from '../../lib/cls'

interface MonthGridProps {
  month: string
  occurrences: Map<string, Occurrence[]>
  photos: Map<string, Photo>
  selected: string
  onSelect: (date: string) => void
}

const WEEKDAY_COLOR = ['text-rose-400', '', '', '', '', '', 'text-sky-400']

export function MonthGrid({ month, occurrences, photos, selected, onSelect }: MonthGridProps) {
  const weeks = monthGrid(month)
  const today = todayISO()

  return (
    <div>
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div key={label} className={cls('text-center text-xs text-muted', WEEKDAY_COLOR[index])}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {weeks.flat().map((date) => (
          <DayCell
            key={date}
            date={date}
            outside={monthKey(date) !== month}
            today={date === today}
            selected={date === selected}
            occurrences={occurrences.get(date) ?? []}
            photo={photos.get(date)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

interface DayCellProps {
  date: string
  outside: boolean
  today: boolean
  selected: boolean
  occurrences: Occurrence[]
  photo?: Photo
  onSelect: (date: string) => void
}

function DayCell({ date, outside, today, selected, occurrences, photo, onSelect }: DayCellProps) {
  const thumbUrl = useObjectUrl(photo?.thumb)
  const day = Number(date.slice(8))
  const weekday = new Date(`${date}T00:00:00`).getDay()

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={cls(
        'relative flex aspect-[1/1.15] flex-col items-center gap-0.5 overflow-hidden bg-surface px-0.5 pt-1',
        outside && 'opacity-35',
        selected && 'ring-2 ring-inset ring-accent',
      )}
    >
      {thumbUrl && (
        <img src={thumbUrl} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
      )}
      <span
        className={cls(
          'relative flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
          today && 'bg-accent font-bold text-accent-fg',
          !today && weekday === 0 && 'text-rose-400',
          !today && weekday === 6 && 'text-sky-400',
        )}
      >
        {day}
      </span>
      <span className="relative flex flex-wrap justify-center gap-0.5">
        {occurrences.slice(0, 4).map((occurrence) => (
          <span
            key={occurrence.key}
            title={occurrence.title}
            style={{ backgroundColor: occurrence.color ?? 'var(--c-muted)' }}
            className="size-1.5 rounded-full"
          />
        ))}
      </span>
    </button>
  )
}
