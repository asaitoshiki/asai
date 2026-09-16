import Dexie, { type EntityTable } from 'dexie'
import type {
  Diary,
  Expense,
  Goods,
  ID,
  Oshi,
  OshiEvent,
  Photo,
  Place,
  Setting,
} from './schema'

// 端末内 IndexedDB。画像も Blob のままここに入る。
class OshikatsuDB extends Dexie {
  oshi!: EntityTable<Oshi, 'id'>
  events!: EntityTable<OshiEvent, 'id'>
  photos!: EntityTable<Photo, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  goods!: EntityTable<Goods, 'id'>
  diaries!: EntityTable<Diary, 'id'>
  places!: EntityTable<Place, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('oshikatsu')
    this.version(1).stores({
      oshi: 'id, sortOrder, name',
      events: 'id, date, oshiId, type, [oshiId+date]',
      photos: 'id, takenOn, createdAt, oshiId, kind, eventId, [oshiId+takenOn]',
      expenses: 'id, date, oshiId, category, [oshiId+date]',
      goods: 'id, oshiId, category, acquiredOn, photoId',
      diaries: 'id, date, oshiId',
      places: 'id, oshiId, visitedOn',
      settings: 'key',
    })
  }
}

export const db = new OshikatsuDB()

export const newId = (): ID => crypto.randomUUID()

/** 新規レコードに付けるタイムスタンプ */
export const stamp = () => {
  const now = Date.now()
  return { createdAt: now, updatedAt: now }
}

export const touch = () => ({ updatedAt: Date.now() })
