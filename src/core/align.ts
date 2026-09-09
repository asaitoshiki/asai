import { EDGE_OVERLAP_RATIO_MIN, OVERLAP_MIN_SEC, OVERLAP_RATIO_MIN } from './constants';
import { intersectionLength, totalLength, union } from './intervals';
import type { Cue, Unit } from './types';

/**
 * 日英キューを時間の重なりで対応付け、表示単位を作る。
 *
 * 日本語字幕は英語字幕の逐語訳ではないので、1対1に揃うことは期待できない。
 * 1対多・多対1は束ねて1つの表示単位にし、重なりが薄い区間は
 * 「対応付け失敗」として記録する（呼び出し側が安全側へ倒すため）。
 * 多対多は対応が読めないので、束ねたうえで失敗扱いにする。
 */
export function alignCues(ja: readonly Cue[], en: readonly Cue[]): Unit[] {
  const groups = groupByOverlap(ja, en);

  const units = groups.map(({ jaIndices, enIndices }) => {
    const jaCues = jaIndices.map((i) => ja[i]!);
    const enCues = enIndices.map((i) => en[i]!);
    return buildUnit(jaCues, enCues);
  });

  units.sort((a, b) => a.start - b.start);
  return trimOverlaps(units);
}

interface Group {
  jaIndices: number[];
  enIndices: number[];
}

/** 重なりのある日英キューを連結成分にまとめる。 */
function groupByOverlap(ja: readonly Cue[], en: readonly Cue[]): Group[] {
  const parent = new Int32Array(ja.length + en.length).map((_, i) => i);

  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root]!;
    for (let cur = x; parent[cur] !== root; ) {
      const next = parent[cur]!;
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const unite = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  // 両方が時刻昇順なので、走査位置を戻すのは重なりの続く範囲だけで足りる
  let enStart = 0;
  for (let i = 0; i < ja.length; i++) {
    const jaCue = ja[i]!;
    while (enStart < en.length && en[enStart]!.end < jaCue.start) enStart++;
    for (let j = enStart; j < en.length && en[j]!.start < jaCue.end; j++) {
      if (hasEdge(jaCue, en[j]!)) unite(i, ja.length + j);
    }
  }

  const groups = new Map<number, Group>();
  const push = (node: number, side: 'ja' | 'en', index: number): void => {
    const root = find(node);
    const group = groups.get(root) ?? { jaIndices: [], enIndices: [] };
    if (side === 'ja') group.jaIndices.push(index);
    else group.enIndices.push(index);
    groups.set(root, group);
  };

  for (let i = 0; i < ja.length; i++) push(i, 'ja', i);
  for (let j = 0; j < en.length; j++) push(ja.length + j, 'en', j);

  return [...groups.values()];
}

/** 2つのキューを同じ表示単位に束ねてよいか。 */
function hasEdge(a: Cue, b: Cue): boolean {
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (overlap < OVERLAP_MIN_SEC) return false;

  const shorter = Math.min(a.end - a.start, b.end - b.start);
  return shorter > 0 && overlap / shorter >= EDGE_OVERLAP_RATIO_MIN;
}

function buildUnit(jaCues: readonly Cue[], enCues: readonly Cue[]): Unit {
  const all = [...jaCues, ...enCues];
  const start = Math.min(...all.map((cue) => cue.start));
  const end = Math.max(...all.map((cue) => cue.end));

  return {
    start,
    end,
    ja: jaCues.map((cue) => cue.text).join('\n'),
    en: enCues.map((cue) => cue.text).join('\n'),
    mapped: isMapped(jaCues, enCues),
  };
}

/** 対応付けが信頼できるかを判定する。 */
function isMapped(jaCues: readonly Cue[], enCues: readonly Cue[]): boolean {
  // 片側しかない区間は対応付けできていない
  if (jaCues.length === 0 || enCues.length === 0) return false;
  // 多対多は対応が読めないので失敗扱いにする
  if (jaCues.length > 1 && enCues.length > 1) return false;

  const jaSpan = union(jaCues);
  const enSpan = union(enCues);
  const shorter = Math.min(totalLength(jaSpan), totalLength(enSpan));
  if (shorter <= 0) return false;

  return intersectionLength(jaSpan, enSpan) / shorter >= OVERLAP_RATIO_MIN;
}

/**
 * 束ねた結果として単位が前後に食い込むことがある。
 * 表示は常に1単位にしたいので、手前の単位の終わりを次の単位の頭で切る。
 */
function trimOverlaps(units: Unit[]): Unit[] {
  for (let i = 1; i < units.length; i++) {
    const prev = units[i - 1]!;
    const current = units[i]!;
    if (prev.end > current.start) prev.end = current.start;
  }
  return units.filter((unit) => unit.end > unit.start);
}
