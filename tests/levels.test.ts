import { describe, expect, it } from 'vitest';
import { assignLevels, probabilitiesFor } from '../src/core/levels';
import { L0, L1, L2, type Unit } from '../src/core/types';
import { MAX_CONSECUTIVE_L2 } from '../src/core/constants';

/** 対応付けに成功した単位を必要な数だけ作る。 */
function units(count: number, mapped = true): Unit[] {
  return Array.from({ length: count }, (_, i) => ({
    start: i * 2,
    end: i * 2 + 2,
    ja: `日本語${i}`,
    en: `English ${i}`,
    mapped,
  }));
}

const options = { load: 60, movieId: 'movie-1', mixSeed: 0 };

describe('probabilitiesFor', () => {
  it('表の点はそのまま返す', () => {
    expect(probabilitiesFor(0)).toEqual([1, 0, 0]);
    expect(probabilitiesFor(30)).toEqual([0.55, 0.4, 0.05]);
    expect(probabilitiesFor(100)).toEqual([0, 0.45, 0.55]);
  });

  it('表の間は線形補間する', () => {
    const p = probabilitiesFor(45);
    expect(p[0]).toBeCloseTo(0.375);
    expect(p[1]).toBeCloseTo(0.475);
    expect(p[2]).toBeCloseTo(0.15);
    expect(p[0] + p[1] + p[2]).toBeCloseTo(1);
  });

  it('範囲外は端に丸める', () => {
    expect(probabilitiesFor(-10)).toEqual([1, 0, 0]);
    expect(probabilitiesFor(200)).toEqual([0, 0.45, 0.55]);
  });
});

describe('assignLevels', () => {
  it('負荷0では全行が日本語になる', () => {
    const levels = assignLevels(units(50), { ...options, load: 0 });
    expect(levels.every((level) => level === L0)).toBe(true);
  });

  it('最初の1行は必ず日本語', () => {
    for (let mixSeed = 0; mixSeed < 20; mixSeed++) {
      expect(assignLevels(units(30), { ...options, load: 100, mixSeed })[0]).toBe(L0);
    }
  });

  it('字幕なしを3行以上続けない', () => {
    for (let mixSeed = 0; mixSeed < 30; mixSeed++) {
      const levels = assignLevels(units(200), { ...options, load: 100, mixSeed });

      let run = 0;
      for (const level of levels) {
        run = level === L2 ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(MAX_CONSECUTIVE_L2);
      }
    }
  });

  it('字幕なしの直前の行は必ず表示されている', () => {
    const levels = assignLevels(units(200), { ...options, load: 100, mixSeed: 7 });

    levels.forEach((level, index) => {
      if (level !== L2) return;
      if (index === 0) throw new Error('冒頭が L2 になっている');
      const runStart = levels[index - 1] !== L2;
      if (runStart) expect(levels[index - 1]).not.toBe(L2);
    });
  });

  it('対応付けに失敗した行は日本語に倒す', () => {
    const mixed = units(20);
    mixed[5]!.mapped = false;
    mixed[11]!.mapped = false;

    const levels = assignLevels(mixed, { ...options, load: 100 });
    expect(levels[5]).toBe(L0);
    expect(levels[11]).toBe(L0);
  });

  it('日本語が無い区間は英語に寄せる', () => {
    const onlyEnglish = units(10);
    onlyEnglish[3]!.ja = '';
    onlyEnglish[3]!.mapped = false;

    expect(assignLevels(onlyEnglish, { ...options, load: 0 })[3]).toBe(L1);
  });

  it('同じ入力なら常に同じ振り分けになる', () => {
    const first = assignLevels(units(100), options);
    const second = assignLevels(units(100), options);
    expect(first).toEqual(second);
  });

  it('混ぜ直すと振り分けが変わる', () => {
    const before = assignLevels(units(100), options);
    const after = assignLevels(units(100), { ...options, mixSeed: 1 });
    expect(after).not.toEqual(before);
  });

  it('負荷が上がるほど日本語の割合は減る', () => {
    const countL0 = (load: number): number =>
      assignLevels(units(500), { ...options, load }).filter((level) => level === L0).length;

    expect(countL0(30)).toBeGreaterThan(countL0(60));
    expect(countL0(60)).toBeGreaterThan(countL0(100));
  });

  it('引いた分布が表におおむね一致する', () => {
    const levels = assignLevels(units(4000), { ...options, load: 60 });
    const share = (target: number): number =>
      levels.filter((level) => level === target).length / levels.length;

    // L2 の連続制限で L2 は表より減り、その分が L0/L1 に回る
    expect(share(L0)).toBeGreaterThan(0.15);
    expect(share(L1)).toBeGreaterThan(0.5);
    expect(share(L2)).toBeGreaterThan(0.15);
    expect(share(L2)).toBeLessThan(0.25);
  });
});
