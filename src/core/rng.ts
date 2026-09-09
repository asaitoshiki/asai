/**
 * 決定的乱数。同じ動画・同じ行なら常に同じ値が出るように、
 * 状態を持たず「シード文字列 → [0,1)」の純関数として引く。
 */

/** FNV-1a 32bit ハッシュ。 */
function hash32(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 を1回だけ回して [0,1) を返す。 */
export function random(seed: string): number {
  let t = (hash32(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 動画・混ぜ直し世代・行インデックスからシード文字列を作る。 */
export function cueSeed(movieId: string, mixSeed: number, index: number, salt = ''): string {
  return `${movieId}:${mixSeed}:${index}:${salt}`;
}
