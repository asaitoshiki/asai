import { describe, expect, it } from 'vitest';
import { alignCues } from '../src/core/align';
import { assignLevels } from '../src/core/levels';
import { parseTtml, parseWebVtt } from '../src/core/parse';
import { MAX_CONSECUTIVE_L2 } from '../src/core/constants';
import { L0, L2 } from '../src/core/types';

/** 日本語は TTML、英語は WebVTT という実際に起きる組み合わせで通す。 */
const japanese = `<tt ttp:tickRate="10000000" xmlns:ttp="http://www.w3.org/ns/ttml#parameter"><body><div>
  <p begin="00:00:01.000" end="00:00:03.000">おはよう</p>
  <p begin="00:00:03.200" end="00:00:07.000">行くぞ、急げ</p>
  <p begin="00:00:20.000" end="00:00:22.000">対応する英語が無い行</p>
</div></body></tt>`;

const english = [
  'WEBVTT',
  '',
  '00:00:01.100 --> 00:00:03.100',
  'Good morning',
  '',
  '00:00:03.300 --> 00:00:05.000',
  "Let's go",
  '',
  '00:00:05.100 --> 00:00:07.000',
  'Hurry up',
].join('\n');

describe('取得から振り分けまで', () => {
  const units = alignCues(parseTtml(japanese), parseWebVtt(english));

  it('英語2行が日本語1行に束ねられる', () => {
    expect(units.map((unit) => [unit.ja, unit.en, unit.mapped])).toEqual([
      ['おはよう', 'Good morning', true],
      ['行くぞ、急げ', "Let's go\nHurry up", true],
      ['対応する英語が無い行', '', false],
    ]);
  });

  it('振り分けが制約を満たす', () => {
    const levels = assignLevels(units, { load: 100, movieId: '80100000', mixSeed: 3 });

    expect(levels[0]).toBe(L0);
    expect(levels[2]).toBe(L0);

    let run = 0;
    for (const level of levels) {
      run = level === L2 ? run + 1 : 0;
      expect(run).toBeLessThanOrEqual(MAX_CONSECUTIVE_L2);
    }
  });
});
