import type { Cue } from './types';
import { parseTtmlTime, parseVttTime } from './timecode';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** タグを落として本文だけにする。<br/> は改行にする。 */
function stripMarkup(inner: string): string {
  return decodeEntities(
    inner
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Netflix の TTML(imsc1 / dfxp) を解析する。
 * XML パーサを持ち込まずに済むよう <p> 要素だけを走査する。
 */
export function parseTtml(body: string): Cue[] {
  const tickRate = Number(/\bttp:tickRate\s*=\s*"(\d+)"/.exec(body)?.[1] ?? 10000000);
  const frameRate = Number(/\bttp:frameRate\s*=\s*"(\d+)"/.exec(body)?.[1] ?? 24);

  const cues: Cue[] = [];
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  for (let m = re.exec(body); m !== null; m = re.exec(body)) {
    const attrs = m[1]!;
    const begin = /\bbegin\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
    const end = /\bend\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
    if (!begin || !end) continue;
    const text = stripMarkup(m[2]!);
    if (!text) continue;
    cues.push({
      start: parseTtmlTime(begin, tickRate, frameRate),
      end: parseTtmlTime(end, tickRate, frameRate),
      text,
    });
  }
  return sortAndMerge(cues);
}

/** WebVTT を解析する。位置指定などのキュー設定は読み飛ばす。 */
export function parseWebVtt(body: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = body.replace(/\r\n?/g, '\n').split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const arrowIndex = lines.findIndex((line) => line.includes('-->'));
    if (arrowIndex < 0) continue;

    const timing = /^\s*(\S+)\s+-->\s+(\S+)/.exec(lines[arrowIndex]!);
    if (!timing) continue;

    const text = stripMarkup(lines.slice(arrowIndex + 1).join('\n'));
    if (!text) continue;

    cues.push({ start: parseVttTime(timing[1]!), end: parseVttTime(timing[2]!), text });
  }
  return sortAndMerge(cues);
}

/** 時刻順に並べ、完全に同じ区間の行は1つにまとめる。 */
function sortAndMerge(cues: Cue[]): Cue[] {
  cues.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Cue[] = [];
  for (const cue of cues) {
    const prev = merged[merged.length - 1];
    if (prev && prev.start === cue.start && prev.end === cue.end) {
      prev.text = `${prev.text}\n${cue.text}`;
      continue;
    }
    merged.push({ ...cue });
  }
  return merged;
}

export function parseTrack(format: 'webvtt' | 'ttml', body: string): Cue[] {
  return format === 'webvtt' ? parseWebVtt(body) : parseTtml(body);
}
