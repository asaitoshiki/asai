/** start 昇順に並んだ区間列から、指定時刻を含む区間を二分探索で引く。 */
export interface Span {
  start: number;
  end: number;
}

/** 指定時刻を含む区間のインデックスを返す。無ければ -1。 */
export function findSpanAt(spans: readonly Span[], time: number): number {
  let lo = 0;
  let hi = spans.length - 1;
  let candidate = -1;

  // start <= time となる最後の区間を探す
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (spans[mid]!.start <= time) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (candidate < 0) return -1;
  return spans[candidate]!.end >= time ? candidate : -1;
}
