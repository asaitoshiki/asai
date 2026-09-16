import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Field, TextArea, TextInput } from '../../components/Field'
import { Button } from '../../components/Button'
import { Chip, ChipRow } from '../../components/Chip'
import { OshiPicker } from '../../components/OshiPicker'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_EMOJI,
  EXPENSE_CATEGORY_LABEL,
  type Expense,
  type ExpenseCategory,
  type ID,
  type Oshi,
} from '../../db/schema'
import { removeExpense, saveExpense } from '../../db/queries'

interface ExpenseFormProps {
  expense?: Expense
  defaultDate: string
  oshiList: Oshi[]
  onClose: () => void
}

export function ExpenseForm({ expense, defaultDate, oshiList, onClose }: ExpenseFormProps) {
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'goods')
  const [oshiId, setOshiId] = useState<ID | undefined>(expense?.oshiId)
  const [memo, setMemo] = useState(expense?.memo ?? '')

  const submit = async () => {
    await saveExpense(
      {
        date,
        amount: Number(amount),
        category,
        oshiId,
        eventId: expense?.eventId,
        memo: memo.trim(),
      },
      expense?.id,
    )
    onClose()
  }

  const destroy = async () => {
    if (!expense) return
    if (!confirm('この支出を削除しますか？')) return
    await removeExpense(expense.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={expense ? '支出を編集' : '支出を記録'}
      footer={
        <Button onClick={submit} disabled={!amount || Number(amount) <= 0}>
          保存する
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="金額">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">¥</span>
            <TextInput
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
            />
          </div>
        </Field>

        <Field label="カテゴリ">
          <ChipRow>
            {EXPENSE_CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={`${EXPENSE_CATEGORY_EMOJI[value]} ${EXPENSE_CATEGORY_LABEL[value]}`}
                active={category === value}
                onClick={() => setCategory(value)}
              />
            ))}
          </ChipRow>
        </Field>

        <Field label="推し">
          <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} />
        </Field>

        <Field label="日付">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="メモ">
          <TextArea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="何を買ったか" />
        </Field>

        {expense && (
          <Button variant="danger" onClick={destroy}>
            この記録を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
