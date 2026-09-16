import { PIN_NUMBERS } from '../domain/rules'

/**
 * スキットル番号ごとの撃破数を示す単系列の棒グラフ。
 * 系列が 1 つなので凡例は置かず、最大値だけ直接ラベルを付けて残りはホバーで補う。
 */
export const PinHitChart = ({ hits }: { hits: number[] }) => {
  const max = Math.max(...hits, 1)

  return (
    <figure className="m-0">
      <figcaption className="mb-4 text-xs text-slate-400">よく倒すスキットル（本数）</figcaption>
      <div className="flex h-24 items-end gap-[2px]">
        {PIN_NUMBERS.map((pin, index) => {
          const value = hits[index]
          const tallest = value === max && value > 0
          return (
            <div
              key={pin}
              title={`${pin} 番：${value} 本`}
              className="relative flex-1 rounded-t bg-amber-500"
              style={{ height: `${Math.max((value / max) * 100, 2)}%` }}
            >
              {tallest && (
                <span className="tabular absolute inset-x-0 -top-4 text-center text-[10px] text-slate-300">
                  {value}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {PIN_NUMBERS.map((pin) => (
          <span key={pin} className="tabular flex-1 text-center text-[10px] text-slate-500">
            {pin}
          </span>
        ))}
      </div>
    </figure>
  )
}
