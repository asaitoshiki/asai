import { cls } from '../lib/cls'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** 2〜3 個の切り替え用。タブより軽い見た目にしたいところで使う */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cls(
            'flex-1 rounded-lg py-1.5 text-sm font-medium',
            value === option.value ? 'bg-accent text-accent-fg' : 'text-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
