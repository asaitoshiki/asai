/**
 * MAIN world で動く唯一のスクリプト。
 * Netflix のプレイヤーマニフェストを JSON.parse / XHR のフックで捕まえ、
 * 日本語・英語の字幕トラックをページコンテキストのまま fetch して
 * content script へ postMessage で渡す。
 *
 * ページコンテキストで fetch するのは、字幕 CDN(nflxvideo.net) を
 * host_permissions に足さずに済ませるため。権限は netflix.com だけに保つ。
 */
import { BRIDGE_SOURCE, type BridgeMessage } from '../shared/messages';
import type { RawTrack, TrackLanguage } from '../core/types';

/** 優先順に並べた TTML/WebVTT プロファイル。先に見つかったものを使う。 */
const PROFILE_PREFERENCE: ReadonlyArray<{ match: RegExp; format: 'webvtt' | 'ttml' }> = [
  { match: /^webvtt/i, format: 'webvtt' },
  { match: /^dfxp|imsc/i, format: 'ttml' },
];

interface NetflixTrack {
  language?: string;
  isNoneTrack?: boolean;
  isForcedNarrative?: boolean;
  ttDownloadables?: Record<string, { downloadUrls?: Record<string, string> }>;
}

const handledMovieIds = new Set<string>();

function post(message: BridgeMessage): void {
  window.postMessage(message, '*');
}

/** 言語コードを ja / en に正規化する。ja-JP や en-US も拾う。 */
function normalizeLanguage(language: string | undefined): TrackLanguage | null {
  if (!language) return null;
  const base = language.toLowerCase().split(/[-_]/)[0];
  if (base === 'ja') return 'ja';
  if (base === 'en') return 'en';
  return null;
}

/** トラックから実際に落とせる URL とフォーマットを1つ選ぶ。 */
function pickDownload(track: NetflixTrack): { url: string; format: 'webvtt' | 'ttml' } | null {
  const downloadables = track.ttDownloadables ?? {};
  for (const { match, format } of PROFILE_PREFERENCE) {
    for (const [profile, entry] of Object.entries(downloadables)) {
      if (!match.test(profile)) continue;
      const url = Object.values(entry?.downloadUrls ?? {})[0];
      if (url) return { url, format };
    }
  }
  return null;
}

/** マニフェスト内の timedtexttracks から ja / en を1本ずつ選ぶ。 */
function selectTracks(tracks: NetflixTrack[]): Map<TrackLanguage, { url: string; format: 'webvtt' | 'ttml' }> {
  const selected = new Map<TrackLanguage, { url: string; format: 'webvtt' | 'ttml' }>();
  for (const track of tracks) {
    if (track.isNoneTrack || track.isForcedNarrative) continue;
    const language = normalizeLanguage(track.language);
    if (!language || selected.has(language)) continue;
    const download = pickDownload(track);
    if (download) selected.set(language, download);
  }
  return selected;
}

async function fetchTracks(movieId: string, tracks: NetflixTrack[]): Promise<void> {
  const selected = selectTracks(tracks);
  if (selected.size < 2) {
    post({
      source: BRIDGE_SOURCE,
      type: 'track-error',
      movieId,
      reason: `日本語・英語の両方が必要ですが ${[...selected.keys()].join(',') || 'なし'} しか見つかりません`,
    });
    return;
  }

  const raw: RawTrack[] = await Promise.all(
    [...selected].map(async ([language, { url, format }]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`字幕トラックの取得に失敗しました (${language}): ${response.status}`);
      return { language, format, body: await response.text() };
    })
  );

  post({ source: BRIDGE_SOURCE, type: 'tracks', movieId, tracks: raw });
}

/** 任意のオブジェクトから timedtexttracks を持つノードを探す。 */
function findManifests(value: unknown, found: Array<{ movieId: string; tracks: NetflixTrack[] }> = [], depth = 0): typeof found {
  if (depth > 6 || typeof value !== 'object' || value === null) return found;

  const node = value as Record<string, unknown>;
  if (Array.isArray(node['timedtexttracks'])) {
    found.push({
      movieId: String(node['movieId'] ?? node['viewableId'] ?? 'unknown'),
      tracks: node['timedtexttracks'] as NetflixTrack[],
    });
  }

  for (const child of Object.values(node)) {
    if (typeof child === 'object' && child !== null) findManifests(child, found, depth + 1);
  }
  return found;
}

function inspect(value: unknown): void {
  for (const { movieId, tracks } of findManifests(value)) {
    if (handledMovieIds.has(movieId)) continue;
    handledMovieIds.add(movieId);
    void fetchTracks(movieId, tracks).catch((error: unknown) => {
      post({ source: BRIDGE_SOURCE, type: 'track-error', movieId, reason: String(error) });
    });
  }
}

/** マニフェストは復号後に必ず JSON.parse を通るので、ここを見張るのが最も確実。 */
const originalParse = JSON.parse;
JSON.parse = function patchedParse(this: unknown, ...args: Parameters<typeof JSON.parse>) {
  const result = originalParse.apply(this, args);
  try {
    inspect(result);
  } catch {
    // 解析に失敗してもページ側の JSON.parse は壊さない
  }
  return result;
};

/** JSON.parse を経由しない経路の保険として XHR のレスポンスも覗く。 */
type XhrOpen = (
  method: string,
  url: string | URL,
  isAsync?: boolean,
  username?: string | null,
  password?: string | null
) => void;

const originalOpen: XhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function patchedOpen(
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  isAsync: boolean = true,
  username?: string | null,
  password?: string | null
): void {
  this.addEventListener('load', () => {
    if (this.responseType !== '' && this.responseType !== 'text') return;
    if (!this.responseText.includes('timedtexttracks')) return;
    try {
      inspect(originalParse(this.responseText));
    } catch {
      // JSON でなければ無視する
    }
  });
  originalOpen.call(this, method, url, isAsync, username, password);
};
