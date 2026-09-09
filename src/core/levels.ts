import { FORCED_L0_HEAD, LOAD_TABLE, MAX_CONSECUTIVE_L2 } from './constants';
import { cueSeed, random } from './rng';
import { L0, L1, L2, type Level, type Unit } from './types';

export interface MixOptions {
  /** 負荷スライダーの値（0〜100） */
  load: number;
  movieId: string;
  /** 「混ぜ直す」で進む世代番号 */
  mixSeed: number;
}

export type Probabilities = readonly [number, number, number];

/** 負荷から各レベルの出現確率を求める。表の間は線形補間する。 */
export function probabilitiesFor(load: number): Probabilities {
  const clamped = Math.min(100, Math.max(0, load));

  const upperIndex = LOAD_TABLE.findIndex((row) => row.load >= clamped);
  const upper = LOAD_TABLE[upperIndex]!;
  const lower = LOAD_TABLE[Math.max(0, upperIndex - 1)]!;
  if (upper.load === lower.load) return upper.p;

  const t = (clamped - lower.load) / (upper.load - lower.load);
  return [
    lower.p[0] + (upper.p[0] - lower.p[0]) * t,
    lower.p[1] + (upper.p[1] - lower.p[1]) * t,
    lower.p[2] + (upper.p[2] - lower.p[2]) * t,
  ];
}

/**
 * 表示単位ごとにレベルを決める。
 *
 * 乱数は行インデックスから決定的に引くので、同じ動画・同じ負荷なら
 * 再生し直しても同じ振り分けになる。振り分けを変えるのは mixSeed だけ。
 */
export function assignLevels(units: readonly Unit[], options: MixOptions): Level[] {
  const p = probabilitiesFor(options.load);
  const levels: Level[] = [];
  let consecutiveL2 = 0;

  units.forEach((unit, index) => {
    const level = decide(unit, index, p, options, consecutiveL2);
    levels.push(level);
    consecutiveL2 = level === L2 ? consecutiveL2 + 1 : 0;
  });

  return levels;
}

function decide(
  unit: Unit,
  index: number,
  p: Probabilities,
  options: MixOptions,
  consecutiveL2: number
): Level {
  // 冒頭は文脈が無いので必ず松葉杖ありから始める
  if (index < FORCED_L0_HEAD) return materialize(unit, L0);

  // 対応付けに失敗した区間は無条件で安全側へ倒す
  if (!unit.mapped) return materialize(unit, L0);

  const drawn = drawLevel(p, random(cueSeed(options.movieId, options.mixSeed, index)));

  // L2 は「連続2行まで」だけを条件にする。冒頭が必ず L0 なので、
  // この制限だけで L2 の run の直前には必ず L0/L1 の行（助走）が来る。
  if (drawn === L2 && consecutiveL2 >= MAX_CONSECUTIVE_L2) {
    return materialize(unit, drawVisible(p, random(cueSeed(options.movieId, options.mixSeed, index, 'demote'))));
  }

  return materialize(unit, drawn);
}

/** 確率分布から1つ引く。 */
function drawLevel(p: Probabilities, r: number): Level {
  if (r < p[0]) return L0;
  if (r < p[0] + p[1]) return L1;
  return L2;
}

/** L2 を落とす先を、L0 と L1 の条件付き確率で引く。 */
function drawVisible(p: Probabilities, r: number): Level {
  const visible = p[0] + p[1];
  return r * visible < p[0] ? L0 : L1;
}

/**
 * 出す材料が無いレベルを、出せるレベルへ寄せる。
 * 日本語が無い区間（英語しか字幕が無い箇所）は L0 にできない。
 */
function materialize(unit: Unit, level: Level): Level {
  if (level === L0 && unit.ja.length === 0) return L1;
  if (level === L1 && unit.en.length === 0) return L0;
  return level;
}
