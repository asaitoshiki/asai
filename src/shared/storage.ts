import type { Level } from '../core/types';

/** 保存するのは設定とフォールバックの記録だけ。サーバーは持たない。 */
export interface Settings {
  enabled: boolean;
  /** 負荷スライダーの値（0〜100） */
  load: number;
  /** 「混ぜ直す」で進む世代番号 */
  mixSeed: number;
}

export const DEFAULT_SETTINGS: Settings = { enabled: true, load: 30, mixSeed: 0 };

/** 聞き取れずに一段下げた行の記録。 */
export interface FallbackRecord {
  movieId: string;
  index: number;
  from: Level;
  to: Level;
  start: number;
  ja: string;
  en: string;
  at: number;
}

/** 記録の上限。古いものから捨てる。 */
const FALLBACK_LIMIT = 500;

const SETTINGS_KEY = 'settings';
const FALLBACKS_KEY = 'fallbacks';

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function loadFallbacks(): Promise<FallbackRecord[]> {
  const stored = await chrome.storage.local.get(FALLBACKS_KEY);
  return (stored[FALLBACKS_KEY] as FallbackRecord[] | undefined) ?? [];
}

export async function appendFallback(record: FallbackRecord): Promise<void> {
  const records = await loadFallbacks();
  records.push(record);
  await chrome.storage.local.set({ [FALLBACKS_KEY]: records.slice(-FALLBACK_LIMIT) });
}

export async function clearFallbacks(): Promise<void> {
  await chrome.storage.local.remove(FALLBACKS_KEY);
}

/** 設定が他のタブやポップアップから変わったときに知らせる。 */
export function onSettingsChanged(handler: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes[SETTINGS_KEY];
    if (!change) return;
    handler({ ...DEFAULT_SETTINGS, ...(change.newValue as Partial<Settings> | undefined) });
  });
}
