import {
  EVENT_TYPE_EMOJI,
  type EventType,
  type ID,
  type Oshi,
  type OshiEvent,
} from '../db/schema'
import { annualInYear, toISO, fromISO } from './date'

/** カレンダーの 1 マスに並ぶ 1 件分。繰り返し予定は日付ごとに展開される */
export interface Occurrence {
  key: string
  date: string
  title: string
  emoji: string
  type: EventType
  color?: string
  oshiId?: ID
  /** 実体の予定 ID。誕生日は推しレコードから自動生成されるので持たない */
  eventId?: ID
  startTime?: string
  venue?: string
  done: boolean
  /** 推しプロフィールの誕生日から自動生成された行か */
  auto: boolean
}

function* eachDay(from: string, to: string) {
  const cursor = fromISO(from)
  const last = fromISO(to)
  while (cursor <= last) {
    yield toISO(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
}

function yearsBetween(from: string, to: string): number[] {
  const first = Number(from.slice(0, 4))
  const last = Number(to.slice(0, 4))
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

const inRange = (date: string, from: string, to: string) => date >= from && date <= to

/**
 * 期間内に表示すべき予定を日付ごとに展開する。
 * 単発の予定・複数日の予定・毎年の記念日・推しの誕生日をまとめて扱う。
 */
export function expandOccurrences(
  events: OshiEvent[],
  oshiList: Oshi[],
  from: string,
  to: string,
): Occurrence[] {
  const colorOf = new Map(oshiList.map((o) => [o.id, o.color]))
  const result: Occurrence[] = []

  for (const event of events) {
    const base = {
      title: event.title,
      emoji: EVENT_TYPE_EMOJI[event.type],
      type: event.type,
      color: event.oshiId ? colorOf.get(event.oshiId) : undefined,
      oshiId: event.oshiId,
      eventId: event.id,
      startTime: event.startTime,
      venue: event.venue,
      done: event.done,
      auto: false,
    }

    if (event.repeatYearly) {
      for (const year of yearsBetween(from, to)) {
        const date = annualInYear(event.date, year)
        if (inRange(date, from, to)) {
          result.push({ ...base, key: `${event.id}:${date}`, date })
        }
      }
      continue
    }

    for (const date of eachDay(event.date, event.endDate || event.date)) {
      if (inRange(date, from, to)) {
        result.push({ ...base, key: `${event.id}:${date}`, date })
      }
    }
  }

  for (const oshi of oshiList) {
    if (!oshi.birthday) continue
    for (const year of yearsBetween(from, to)) {
      const date = `${year}-${oshi.birthday}`
      if (!inRange(date, from, to)) continue
      result.push({
        key: `birthday:${oshi.id}:${date}`,
        date,
        title: `${oshi.name}のお誕生日`,
        emoji: '🎂',
        type: 'birthday',
        color: oshi.color,
        oshiId: oshi.id,
        done: false,
        auto: true,
      })
    }
  }

  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startTime || '99:99').localeCompare(b.startTime || '99:99') ||
      a.title.localeCompare(b.title, 'ja'),
  )
}

/** 日付をキーにしたマップに畳む。カレンダーのマス描画用 */
export function groupByDate(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>()
  for (const occurrence of occurrences) {
    const list = map.get(occurrence.date)
    if (list) list.push(occurrence)
    else map.set(occurrence.date, [occurrence])
  }
  return map
}
