import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Fab } from '../../components/Fab'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/EmptyState'
import { RankedBars, type BarRow } from '../../components/charts/RankedBars'
import { MonthlyColumns, type ColumnPoint } from '../../components/charts/MonthlyColumns'
import { ExpenseForm } from './ExpenseForm'
import { listExpenses, listOshi } from '../../db/queries'
import {
  EXPENSE_CATEGORY_EMOJI,
  EXPENSE_CATEGORY_LABEL,
  type Expense,
  type ExpenseCategory,
} from '../../db/schema'
import { addMonths, formatDate, formatMonth, monthKey, monthStart, todayISO } from '../../lib/date'
import { formatYen } from '../../lib/money'

const TREND_MONTHS = 6

export function ExpensePage() {
  const today = todayISO()
  const [month, setMonth] = useState(monthKey(today))
  const [editing, setEditing] = useState<Expense | 'new'>()

  const oshiList = useLiveQuery(listOshi, [], [])
  const expenses = useLiveQuery(listExpenses, [], [])

  const inMonth = expenses.filter((expense) => monthKey(expense.date) === month)
  const monthTotal = inMonth.reduce((sum, expense) => sum + expense.amount, 0)
  const allTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const byCategory = useMemo<BarRow[]>(() => {
    const totals = new Map<ExpenseCategory, number>()
    for (const expense of inMonth) {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount)
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, value]) => ({
        key: category,
        label: EXPENSE_CATEGORY_LABEL[category],
        emoji: EXPENSE_CATEGORY_EMOJI[category],
        value,
      }))
  }, [inMonth])

  const byOshi = useMemo<BarRow[]>(() => {
    const totals = new Map<string, number>()
    for (const expense of inMonth) {
      const key = expense.oshiId ?? 'none'
      totals.set(key, (totals.get(key) ?? 0) + expense.amount)
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => {
        const oshi = oshiList.find((item) => item.id === key)
        return {
          key,
          label: oshi?.name ?? '推し指定なし',
          color: oshi?.color,
          value,
        }
      })
  }, [inMonth, oshiList])

  const trend = useMemo<ColumnPoint[]>(() => {
    const months = Array.from({ length: TREND_MONTHS }, (_, i) =>
      monthKey(addMonths(monthStart(month), i - (TREND_MONTHS - 1))),
    )
    return months.map((key) => ({
      key,
      label: `${Number(key.slice(5))}月`,
      value: expenses
        .filter((expense) => monthKey(expense.date) === key)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
  }, [expenses, month])

  return (
    <AppShell
      title="支出"
      subtitle={formatMonth(month)}
      action={
        <div className="flex items-center gap-1">
          <button type="button" aria-label="前の月" onClick={() => setMonth(monthKey(addMonths(monthStart(month), -1)))}>
            <Icon name="back" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthKey(today))}
            className="rounded-full border border-line px-2.5 py-1 text-xs"
          >
            今月
          </button>
          <button type="button" aria-label="次の月" onClick={() => setMonth(monthKey(addMonths(monthStart(month), 1)))}>
            <Icon name="next" className="size-5" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="card p-5 text-center">
          <p className="text-xs text-muted">{formatMonth(month)}の支出</p>
          <p className="my-1 text-4xl font-bold tabular-nums text-accent">{formatYen(monthTotal)}</p>
          <p className="text-xs text-muted">これまでの合計 {formatYen(allTotal)}</p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">月ごとの推移</h2>
          <MonthlyColumns points={trend} activeKey={month} />
          <p className="mt-2 text-right text-[10px] text-muted">単位: 千円</p>
        </section>

        {byCategory.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-bold">カテゴリ別</h2>
            <RankedBars rows={byCategory} />
          </section>
        )}

        {byOshi.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-bold">推し別</h2>
            <RankedBars rows={byOshi} />
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold">明細</h2>
          {inMonth.length === 0 ? (
            <EmptyState emoji="🧾" title="この月の記録はありません" hint="右下のボタンから追加できます" />
          ) : (
            <ul className="space-y-2">
              {inMonth.map((expense) => {
                const oshi = oshiList.find((item) => item.id === expense.oshiId)
                return (
                  <li key={expense.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(expense)}
                      className="card flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span className="text-lg">{EXPENSE_CATEGORY_EMOJI[expense.category]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {expense.memo || EXPENSE_CATEGORY_LABEL[expense.category]}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatDate(expense.date)}
                          {oshi && ` ・ ${oshi.name}`}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums">{formatYen(expense.amount)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <Fab label="支出を記録" onClick={() => setEditing('new')} />

      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? undefined : editing}
          defaultDate={month === monthKey(today) ? today : monthStart(month)}
          oshiList={oshiList}
          onClose={() => setEditing(undefined)}
        />
      )}
    </AppShell>
  )
}
