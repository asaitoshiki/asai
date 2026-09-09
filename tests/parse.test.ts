import { describe, expect, it } from 'vitest';
import { parseTtml, parseWebVtt } from '../src/core/parse';

describe('parseTtml', () => {
  it('ティック表記の begin/end を秒に変換する', () => {
    const body = `<tt ttp:tickRate="10000000" xmlns:ttp="http://www.w3.org/ns/ttml#parameter">
      <body><div>
        <p begin="10000000t" end="30000000t">こんにちは<br/>元気ですか</p>
      </div></body></tt>`;

    expect(parseTtml(body)).toEqual([{ start: 1, end: 3, text: 'こんにちは\n元気ですか' }]);
  });

  it('span を落として本文だけにし、実体参照を戻す', () => {
    const body = `<tt><p begin="00:00:01.000" end="00:00:02.500"><span style="s1">A &amp; B</span></p></tt>`;
    expect(parseTtml(body)).toEqual([{ start: 1, end: 2.5, text: 'A & B' }]);
  });

  it('同じ区間の行はまとめる', () => {
    const body = `<tt>
      <p begin="00:00:01.000" end="00:00:02.000">一行目</p>
      <p begin="00:00:01.000" end="00:00:02.000">二行目</p>
    </tt>`;
    expect(parseTtml(body)).toEqual([{ start: 1, end: 2, text: '一行目\n二行目' }]);
  });
});

describe('parseWebVtt', () => {
  it('キュー設定とタグを読み飛ばす', () => {
    const body = [
      'WEBVTT',
      '',
      '1',
      '00:00:01.000 --> 00:00:03.200 line:85% align:center',
      '<c.bg_transparent>Hello there</c>',
      '',
      '2',
      '00:01:00.500 --> 00:01:02.000',
      'Second line',
    ].join('\n');

    expect(parseWebVtt(body)).toEqual([
      { start: 1, end: 3.2, text: 'Hello there' },
      { start: 60.5, end: 62, text: 'Second line' },
    ]);
  });
});
