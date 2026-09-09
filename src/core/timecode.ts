/**
 * TTML の時刻表記を秒へ変換する。
 * Netflix は imsc1 のティック表記（例: 123456789t）を使うことが多いが、
 * clock-time（00:00:01.500 / 00:00:01:12）と offset-time（1.5s）も来る。
 */
export function parseTtmlTime(value: string, tickRate: number, frameRate: number): number {
  const v = value.trim();

  // offset-time: 数値 + 単位
  const offset = /^(\d+(?:\.\d+)?)(h|m|s|ms|f|t)$/.exec(v);
  if (offset) {
    const n = Number(offset[1]);
    switch (offset[2]) {
      case 'h':
        return n * 3600;
      case 'm':
        return n * 60;
      case 's':
        return n;
      case 'ms':
        return n / 1000;
      case 'f':
        return n / frameRate;
      case 't':
        return n / tickRate;
    }
  }

  // clock-time: hh:mm:ss(.fff | :frames)
  const clock = /^(\d+):(\d{2}):(\d{2})(?:[.,](\d+)|:(\d+))?$/.exec(v);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    const s = Number(clock[3]);
    const frac = clock[4] ? Number(`0.${clock[4]}`) : 0;
    const frames = clock[5] ? Number(clock[5]) / frameRate : 0;
    return h * 3600 + m * 60 + s + frac + frames;
  }

  throw new Error(`submix: 解釈できない TTML 時刻表記です: ${value}`);
}

/** WebVTT の hh:mm:ss.fff / mm:ss.fff を秒へ変換する。 */
export function parseVttTime(value: string): number {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(value.trim());
  if (!m) throw new Error(`submix: 解釈できない WebVTT 時刻表記です: ${value}`);
  const h = m[1] ? Number(m[1]) : 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]!.padEnd(3, '0')) / 1000;
}
