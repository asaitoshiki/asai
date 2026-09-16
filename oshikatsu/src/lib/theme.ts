export type ThemeSetting = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'oshikatsu:theme'

export function loadTheme(): ThemeSetting {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'auto'
}

/** auto のときは OS の設定に合わせて解決する */
export function applyTheme(setting: ThemeSetting) {
  localStorage.setItem(STORAGE_KEY, setting)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = setting === 'auto' ? (prefersDark ? 'dark' : 'light') : setting
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}
