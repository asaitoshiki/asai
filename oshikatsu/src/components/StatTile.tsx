import type { ReactNode } from 'react'

/** 単一の数値はグラフにせずタイルで見せる */
export function StatTile({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span>}
      </p>
    </div>
  )
}
