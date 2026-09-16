import { cls } from '../../lib/cls'
import { formatNumber } from '../../lib/money'

export interface ColumnPoint {
  key: string
  label: string
  value: number
}

/** 千円単位。金額をそのまま並べると桁が多くて読みにくいため */
const toThousands = (value: number) => Math.round(value / 100) / 10

/** 月ごとの推移。見ている月を強調し、それ以外は控えめに置く */
export function MonthlyColumns({ points, activeKey }: { points: ColumnPoint[]; activeKey?: string }) {
  const max = Math.max(...points.map((point) => point.value), 1)

  return (
    <div className="flex h-40 gap-2">
      {points.map((point) => {
        const active = point.key === activeKey
        return (
          <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className={cls('text-[10px] tabular-nums', active ? 'font-bold text-fg' : 'text-muted')}>
              {active || point.value > 0 ? formatNumber(toThousands(point.value)) : ''}
            </span>
            {/* 棒の高さを % で出すため、描画領域の高さを確定させる */}
            <div className="relative w-full flex-1">
              <div
                title={`${point.label} ${formatNumber(point.value)}円`}
                style={{
                  height: `${(point.value / max) * 100}%`,
                  backgroundColor: 'var(--c-chart)',
                  opacity: active ? 1 : 0.45,
                }}
                className="absolute inset-x-0 bottom-0 rounded-t-[4px]"
              />
            </div>
            <span className={cls('text-[10px]', active ? 'font-bold text-fg' : 'text-muted')}>
              {point.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
