// 日付はすべてローカルタイムの YYYY-MM-DD 文字列で扱う。
// Date オブジェクトを跨ぐと UTC ずれで前日になるため、文字列を正とする。

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

export function addMonths(iso: string, months: number): string {
  const date = fromISO(iso)
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return toISO(date)
}

/** 2 つの日付の差（日数）。b - a */
export function diffDays(a: string, b: string): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function daysUntil(iso: string): number {
  return diffDays(todayISO(), iso)
}

/** 推し始めた日から今日までの日数（初日を 1 日目と数える） */
export function daysSinceStart(iso: string): number {
  return diffDays(iso, todayISO()) + 1
}

export const monthKey = (iso: string): string => iso.slice(0, 7)
export const monthStart = (key: string): string => `${key}-01`

export function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return toISO(new Date(y, m, 0))
}

/** 日曜始まりの月間カレンダー。前後の月の日も埋めた 6 週 × 7 日を返す */
export function monthGrid(key: string): string[][] {
  const first = fromISO(monthStart(key))
  const cursor = new Date(first)
  cursor.setDate(1 - first.getDay())

  const weeks: string[][] = []
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      week.push(toISO(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** MM-DD の記念日について、基準日以降で最初に来る日付を返す */
export function nextAnnual(monthDay: string, from = todayISO()): string {
  const year = Number(from.slice(0, 4))
  const thisYear = `${year}-${monthDay}`
  return thisYear >= from ? thisYear : `${year + 1}-${monthDay}`
}

/** 毎年繰り返す予定が、指定した年に来る日付 */
export function annualInYear(iso: string, year: number): string {
  return `${year}-${iso.slice(5)}`
}

export function formatDate(iso: string): string {
  const date = fromISO(iso)
  return `${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAY_LABELS[date.getDay()]})`
}

export function formatFullDate(iso: string): string {
  const date = fromISO(iso)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAY_LABELS[date.getDay()]})`
}

export function formatMonth(key: string): string {
  const [y, m] = key.split('-')
  return `${y}年${Number(m)}月`
}

/** カウントダウン用の文言。今日・明日・n日後 / n日前 */
export function relativeLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days === 0) return '今日'
  if (days === 1) return '明日'
  if (days === 2) return 'あさって'
  if (days > 0) return `あと${days}日`
  if (days === -1) return '昨日'
  return `${-days}日前`
}

/** 誕生日から、その日に迎える年齢を求める（生年が分かっている場合のみ） */
export function ageOn(birthYear: number, iso: string): number {
  return Number(iso.slice(0, 4)) - birthYear
}
