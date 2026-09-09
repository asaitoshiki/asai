/** 区間演算。対応付けの重なり比を、束ねた区間どうしで正しく測るために使う。 */
export interface Interval {
  start: number;
  end: number;
}

/** 重なりを潰して昇順の非重複区間列にする。 */
export function union(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const item of sorted) {
    const last = merged[merged.length - 1];
    if (last && item.start <= last.end) {
      last.end = Math.max(last.end, item.end);
      continue;
    }
    merged.push({ ...item });
  }
  return merged;
}

export function totalLength(intervals: readonly Interval[]): number {
  return intervals.reduce((sum, item) => sum + (item.end - item.start), 0);
}

/** 2つの非重複区間列の共通部分の長さ。 */
export function intersectionLength(a: readonly Interval[], b: readonly Interval[]): number {
  let i = 0;
  let j = 0;
  let total = 0;

  while (i < a.length && j < b.length) {
    const left = a[i]!;
    const right = b[j]!;
    total += Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start));
    if (left.end < right.end) i++;
    else j++;
  }
  return total;
}
