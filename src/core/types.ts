/** 字幕1行。時刻は秒。 */
export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** 表示レベル。L0=日本語 / L1=英語 / L2=なし。 */
export const L0 = 0;
export const L1 = 1;
export const L2 = 2;
export type Level = typeof L0 | typeof L1 | typeof L2;

/**
 * 日英を対応付けた表示単位。1対多・多対1は束ねて1つになる。
 * mapped=false は対応付けに失敗した区間で、安全側（日本語）へ倒す対象。
 */
export interface Unit {
  start: number;
  end: number;
  ja: string;
  en: string;
  mapped: boolean;
}

export type TrackLanguage = 'ja' | 'en';

/** ページコンテキストで取得した字幕トラックの生データ。 */
export interface RawTrack {
  language: TrackLanguage;
  /** 'webvtt' | 'ttml' */
  format: 'webvtt' | 'ttml';
  body: string;
}
