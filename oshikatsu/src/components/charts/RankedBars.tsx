import { formatYen } from '../../lib/money'

export interface BarRow {
  key: string
  label: string
  value: number
  /** 推し別集計のように、行そのものに色の意味がある場合だけ指定する */
  color?: string
  emoji?: string
}

/**
 * 大小の比較用の横棒グラフ。項目名と金額を必ず直接ラベルするので、
 * 色だけで内容を読ませることはない。
 */
export function RankedBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-muted">
              {row.emoji && <span className="mr-1">{row.emoji}</span>}
              {row.label}
            </span>
            <span className="shrink-0 font-bold tabular-nums">{formatYen(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-chart-track">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((row.value / max) * 100, 2)}%`,
                backgroundColor: row.color ?? 'var(--c-chart)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
