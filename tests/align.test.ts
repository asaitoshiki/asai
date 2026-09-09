import { describe, expect, it } from 'vitest';
import { alignCues } from '../src/core/align';
import type { Cue } from '../src/core/types';

const cue = (start: number, end: number, text: string): Cue => ({ start, end, text });

describe('alignCues', () => {
  it('十分に重なる1対1はそのまま対応させる', () => {
    const units = alignCues([cue(1, 3, 'おはよう')], [cue(1.1, 3.1, 'Good morning')]);

    expect(units).toEqual([{ start: 1, end: 3.1, ja: 'おはよう', en: 'Good morning', mapped: true }]);
  });

  it('英語2行が日本語1行にまとまる場合は束ねて1単位にする', () => {
    const units = alignCues([cue(1, 5, '行くぞ、急げ')], [cue(1, 2.8, "Let's go"), cue(2.9, 5, 'Hurry up')]);

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ ja: '行くぞ、急げ', en: "Let's go\nHurry up", mapped: true });
  });

  it('束ねはしたが重なりが薄い場合は対応付け失敗にする', () => {
    // 重なり 0.6 秒 / 短いほうの尺 2 秒 = 0.3 で、束ねる条件は満たすが信頼はできない
    const units = alignCues([cue(1, 3, '短い日本語')], [cue(2.4, 6, 'Loosely related line')]);

    expect(units).toHaveLength(1);
    expect(units[0]!.mapped).toBe(false);
  });

  it('ほとんど重ならない行はそもそも束ねない', () => {
    const units = alignCues([cue(1, 5, '長い日本語')], [cue(4.9, 9, 'Barely touching')]);

    expect(units).toHaveLength(2);
    expect(units.every((unit) => !unit.mapped)).toBe(true);
  });

  it('片側しかない区間は対応付け失敗にする', () => {
    const units = alignCues([cue(1, 2, '日本語だけ')], [cue(10, 11, 'English only')]);

    expect(units.map((unit) => [unit.ja, unit.en, unit.mapped])).toEqual([
      ['日本語だけ', '', false],
      ['', 'English only', false],
    ]);
  });

  it('多対多は束ねたうえで失敗扱いにする', () => {
    const units = alignCues(
      [cue(1, 3, 'ja1'), cue(3, 5, 'ja2')],
      [cue(2, 4, 'en1'), cue(4, 6, 'en2')]
    );

    expect(units).toHaveLength(1);
    expect(units[0]!.mapped).toBe(false);
  });

  it('行の境目の薄い重なりでは束ねない', () => {
    // en1 は ja2 に 0.2 秒だけ食い込むが、これで数珠つなぎにしてはいけない
    const units = alignCues(
      [cue(1, 4, 'ja1'), cue(4, 7, 'ja2')],
      [cue(0.9, 4.2, 'en1'), cue(4.2, 7, 'en2')]
    );

    expect(units).toHaveLength(2);
    expect(units.map((unit) => unit.ja)).toEqual(['ja1', 'ja2']);
  });

  it('単位は時刻順で重ならない', () => {
    const units = alignCues(
      [cue(1, 4, 'ja1'), cue(4.5, 6, 'ja2'), cue(6.2, 9, 'ja3')],
      [cue(1, 4, 'en1'), cue(4.5, 6, 'en2'), cue(6.2, 9, 'en3')]
    );

    for (let i = 1; i < units.length; i++) {
      expect(units[i - 1]!.end).toBeLessThanOrEqual(units[i]!.start);
    }
  });
});
