import { Sheet } from '../../components/Sheet'
import { PhotoThumb } from '../../components/PhotoThumb'
import { ImageInput } from '../../components/ImageInput'
import { addPhoto } from '../../db/queries'
import {
  EXPENSE_CATEGORY_EMOJI,
  EXPENSE_CATEGORY_LABEL,
  MOOD_EMOJI,
  type Diary,
  type Expense,
  type ID,
  type Photo,
  type PhotoKind,
} from '../../db/schema'
import type { Occurrence } from '../../lib/calendar'
import { formatFullDate } from '../../lib/date'
import { formatYen } from '../../lib/money'

interface DaySheetProps {
  date: string
  occurrences: Occurrence[]
  photos: Photo[]
  expenses: Expense[]
  diaries: Diary[]
  onClose: () => void
  onAddEvent: () => void
  onEditEvent: (id: ID) => void
  onAddExpense: () => void
  onEditExpense: (id: ID) => void
  onAddDiary: () => void
  onEditDiary: (id: ID) => void
  onOpenPhoto: (photo: Photo) => void
}

const QUICK_PHOTO_KINDS: { kind: PhotoKind; label: string }[] = [
  { kind: 'cheki', label: 'チェキを追加' },
  { kind: 'photo', label: '写真を追加' },
]

export function DaySheet(props: DaySheetProps) {
  const { date, occurrences, photos, expenses, diaries } = props
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const attach = async (files: File[], kind: PhotoKind) => {
    for (const file of files) {
      await addPhoto(file, {
        kind,
        takenOn: date,
        caption: '',
        tags: [],
        favorite: false,
      })
    }
  }

  return (
    <Sheet open onClose={props.onClose} title={formatFullDate(date)}>
      <div className="space-y-5">
        <Section title="予定・記念日" actionLabel="＋ 追加" onAction={props.onAddEvent}>
          {occurrences.length === 0 ? (
            <Blank>予定はありません</Blank>
          ) : (
            <ul className="space-y-2">
              {occurrences.map((occurrence) => (
                <li key={occurrence.key}>
                  <button
                    type="button"
                    disabled={occurrence.auto}
                    onClick={() => occurrence.eventId && props.onEditEvent(occurrence.eventId)}
                    className="card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="text-lg">{occurrence.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{occurrence.title}</p>
                      <p className="truncate text-xs text-muted">
                        {[occurrence.startTime, occurrence.venue].filter(Boolean).join(' ・ ') ||
                          (occurrence.auto ? '推しプロフィールの誕生日' : '')}
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
        </Section>

        <Section title="写真・チェキ">
          {photos.length > 0 && (
            <div className="mb-2 grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} onClick={() => props.onOpenPhoto(photo)} />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {QUICK_PHOTO_KINDS.map(({ kind, label }) => (
              <ImageInput
                key={kind}
                multiple
                onPick={(files) => attach(files, kind)}
                className="flex-1 rounded-xl border border-line bg-surface-2 py-2.5 text-center text-sm"
              >
                {label}
              </ImageInput>
            ))}
          </div>
        </Section>

        <Section title="支出" actionLabel="＋ 追加" onAction={props.onAddExpense}>
          {expenses.length === 0 ? (
            <Blank>記録はありません</Blank>
          ) : (
            <>
              <ul className="space-y-2">
                {expenses.map((expense) => (
                  <li key={expense.id}>
                    <button
                      type="button"
                      onClick={() => props.onEditExpense(expense.id)}
                      className="card flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span>{EXPENSE_CATEGORY_EMOJI[expense.category]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {expense.memo || EXPENSE_CATEGORY_LABEL[expense.category]}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatYen(expense.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-sm text-muted">
                合計 <span className="font-bold text-fg tabular-nums">{formatYen(total)}</span>
              </p>
            </>
          )}
        </Section>

        <Section title="日記" actionLabel="＋ 書く" onAction={props.onAddDiary}>
          {diaries.length === 0 ? (
            <Blank>まだ書かれていません</Blank>
          ) : (
            <ul className="space-y-2">
              {diaries.map((diary) => (
                <li key={diary.id}>
                  <button
                    type="button"
                    onClick={() => props.onEditDiary(diary.id)}
                    className="card w-full p-3 text-left"
                  >
                    <p className="text-sm font-medium">
                      {MOOD_EMOJI[diary.mood]} {diary.title || '無題'}
                    </p>
                    {diary.body && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{diary.body}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Sheet>
  )
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="text-sm text-accent">
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

const Blank = ({ children }: { children: React.ReactNode }) => (
  <p className="py-3 text-center text-sm text-muted">{children}</p>
)
