import { cls } from '../lib/cls'

interface ChipProps {
  label: string
  active?: boolean
  color?: string
  onClick?: () => void
}

/** 絞り込みや種別選択に使う丸いタグ */
export function Chip({ label, active = false, color, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={cls(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? color
            ? 'border-transparent text-white'
            : 'border-accent bg-accent text-accent-fg'
          : 'border-line bg-surface text-muted',
      )}
    >
      {label}
    </button>
  )
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">{children}</div>
}
