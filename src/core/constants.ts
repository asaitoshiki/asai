import { type Level, L0, L1, L2 } from './types';

/**
 * 負荷スライダー（0〜100）と各レベルの出現確率の対応表。
 * 表にない負荷は隣接する2点から線形補間する。調整はここだけで完結させる。
 */
export const LOAD_TABLE: ReadonlyArray<{ load: number; p: readonly [number, number, number] }> = [
  { load: 0, p: [1.0, 0.0, 0.0] },
  { load: 30, p: [0.55, 0.4, 0.05] },
  { load: 60, p: [0.2, 0.55, 0.25] },
  { load: 100, p: [0.0, 0.45, 0.55] },
];

/** L2（字幕なし）を連続させてよい上限。これを超えた行は L0/L1 へ落とす。 */
export const MAX_CONSECUTIVE_L2 = 2;

/** 冒頭の何行を必ず L0 にするか。 */
export const FORCED_L0_HEAD = 1;

/**
 * 日英の対応付けで「十分に重なった」とみなす比率。
 * 重なり時間 / 短いほうの尺 がこの値未満なら対応付け失敗とする。
 */
export const OVERLAP_RATIO_MIN = 0.5;

/** 対応付けのグラフを作るときに辺とみなす最小の重なり秒数。 */
export const OVERLAP_MIN_SEC = 0.05;

/**
 * 辺とみなす最小の重なり比率。
 * 行の境目が数百ミリ秒ずれるだけの薄い重なりで連結成分が数珠つなぎに
 * 育つのを防ぐため、秒数だけでなく短いほうの尺に対する比率でも締める。
 */
export const EDGE_OVERLAP_RATIO_MIN = 0.2;

/** フォールバック時に行頭から何秒手前へ巻き戻すか。 */
export const FALLBACK_PREROLL_SEC = 0.4;

/** フォールバックのキー（KeyboardEvent.key）。 */
export const FALLBACK_KEY = 'd';

/** 一段だけ下げる対応。L0 はこれ以上下げない。 */
export const FALLBACK_STEP: Readonly<Record<Level, Level>> = {
  [L0]: L0,
  [L1]: L0,
  [L2]: L1,
};
