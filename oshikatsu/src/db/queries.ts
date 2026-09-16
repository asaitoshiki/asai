import type { EntityTable } from 'dexie'
import { db, newId, stamp, touch } from './db'
import type {
  Diary,
  Expense,
  Goods,
  ID,
  Oshi,
  OshiEvent,
  Photo,
  PhotoKind,
  Place,
  Stamped,
} from './schema'
import { processImage } from '../lib/image'
import { monthEnd, monthStart } from '../lib/date'

/** フォームが組み立てる値。ID とタイムスタンプは保存側で付ける */
export type Draft<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

/** すべてのテーブルが共有する最小の形。upsert のキャスト先として使う */
type StampedTable = EntityTable<Stamped & { id: ID }, 'id'>

async function upsert<T extends Stamped & { id: ID }>(
  table: EntityTable<T, 'id'>,
  draft: Draft<T>,
  id?: ID,
): Promise<ID> {
  if (id) {
    // Dexie の ID 型は条件型のためジェネリクス越しに解決できず、ここだけキャストする
    await (table as unknown as StampedTable).update(id, { ...draft, ...touch() })
    return id
  }
  const record = { ...draft, id: newId(), ...stamp() } as T
  await table.add(record)
  return record.id
}

/* ---------------- 推し ---------------- */

export const listOshi = () => db.oshi.orderBy('sortOrder').toArray()

export const getOshi = (id: ID) => db.oshi.get(id)

export const saveOshi = (draft: Draft<Oshi>, id?: ID) => upsert(db.oshi, draft, id)

/**
 * 推しを削除する。紐づく記録は消さず、推しの紐付けだけ外す。
 * 写真や支出まで巻き添えで消えると取り返しがつかないため。
 */
export async function removeOshi(id: ID) {
  await db.transaction(
    'rw',
    [db.oshi, db.events, db.photos, db.expenses, db.goods, db.diaries, db.places],
    async () => {
      const detach = { oshiId: undefined, ...touch() }
      await db.events.where('oshiId').equals(id).modify(detach)
      await db.photos.where('oshiId').equals(id).modify(detach)
      await db.expenses.where('oshiId').equals(id).modify(detach)
      await db.goods.where('oshiId').equals(id).modify(detach)
      await db.diaries.where('oshiId').equals(id).modify(detach)
      await db.places.where('oshiId').equals(id).modify(detach)
      await db.oshi.delete(id)
    },
  )
}

export async function reorderOshi(ids: ID[]) {
  await db.transaction('rw', db.oshi, async () => {
    await Promise.all(ids.map((id, index) => db.oshi.update(id, { sortOrder: index })))
  })
}

/* ---------------- 予定・記念日 ---------------- */

/** 期間で絞る。毎年繰り返す予定は年をまたぐので別途すべて取得して合流させる */
export async function listEventsInRange(from: string, to: string) {
  const [dated, repeating] = await Promise.all([
    db.events.where('date').between(from, to, true, true).toArray(),
    db.events.filter((event) => event.repeatYearly).toArray(),
  ])
  const multiDay = await db.events
    .filter((event) => !event.repeatYearly && !!event.endDate && event.date < from && event.endDate >= from)
    .toArray()

  const seen = new Set(dated.map((event) => event.id))
  return [...dated, ...repeating.filter((e) => !seen.has(e.id)), ...multiDay.filter((e) => !seen.has(e.id))]
}

export const listAllEvents = () => db.events.orderBy('date').toArray()

export const getEvent = (id: ID) => db.events.get(id)

export const saveEvent = (draft: Draft<OshiEvent>, id?: ID) => upsert(db.events, draft, id)

export const removeEvent = (id: ID) => db.events.delete(id)

export const toggleEventDone = async (id: ID, done: boolean) => {
  await db.events.update(id, { done, ...touch() })
}

/* ---------------- 写真 ---------------- */

export type PhotoDraft = Omit<Draft<Photo>, 'blob' | 'thumb' | 'width' | 'height'>

/** 元ファイルを縮小＋サムネ生成してから保存する */
export async function addPhoto(file: Blob, draft: PhotoDraft): Promise<ID> {
  const processed = await processImage(file)
  const record: Photo = {
    ...draft,
    ...processed,
    id: newId(),
    ...stamp(),
  }
  await db.photos.add(record)
  return record.id
}

export const getPhoto = (id: ID) => db.photos.get(id)

export const getPhotos = (ids: ID[]) =>
  db.photos.bulkGet(ids).then((list) => list.filter((photo): photo is Photo => !!photo))

export const listPhotos = () => db.photos.orderBy('takenOn').reverse().toArray()

export const listPhotosOn = (date: string) => db.photos.where('takenOn').equals(date).toArray()

export const listPhotosOfOshi = (oshiId: ID) =>
  db.photos.where('oshiId').equals(oshiId).reverse().sortBy('takenOn')

export async function updatePhoto(
  id: ID,
  changes: Partial<Pick<Photo, 'caption' | 'tags' | 'favorite' | 'oshiId' | 'eventId' | 'kind' | 'takenOn'>>,
) {
  await db.photos.update(id, { ...changes, ...touch() })
}

/** 写真を削除し、日記や聖地からの参照も外す */
export async function removePhoto(id: ID) {
  await db.transaction('rw', [db.photos, db.goods, db.diaries, db.places], async () => {
    await db.goods.where('photoId').equals(id).modify({ photoId: undefined, ...touch() })
    await db.diaries
      .filter((diary) => diary.photoIds.includes(id))
      .modify((diary) => {
        diary.photoIds = diary.photoIds.filter((photoId) => photoId !== id)
        diary.updatedAt = Date.now()
      })
    await db.places
      .filter((place) => place.photoIds.includes(id))
      .modify((place) => {
        place.photoIds = place.photoIds.filter((photoId) => photoId !== id)
        place.updatedAt = Date.now()
      })
    await db.photos.delete(id)
  })
}

export const countPhotosByKind = async (kind: PhotoKind) =>
  db.photos.where('kind').equals(kind).count()

/* ---------------- 支出 ---------------- */

export const listExpenses = () => db.expenses.orderBy('date').reverse().toArray()

export const listExpensesInMonth = (key: string) =>
  db.expenses.where('date').between(monthStart(key), monthEnd(key), true, true).reverse().sortBy('date')

export const listExpensesOn = (date: string) => db.expenses.where('date').equals(date).toArray()

export const saveExpense = (draft: Draft<Expense>, id?: ID) => upsert(db.expenses, draft, id)

export const removeExpense = (id: ID) => db.expenses.delete(id)

/* ---------------- グッズ ---------------- */

export const listGoods = () => db.goods.orderBy('category').toArray()

export const saveGoods = (draft: Draft<Goods>, id?: ID) => upsert(db.goods, draft, id)

export const removeGoods = (id: ID) => db.goods.delete(id)

/* ---------------- 日記 ---------------- */

export const listDiaries = () => db.diaries.orderBy('date').reverse().toArray()

export const listDiariesOn = (date: string) => db.diaries.where('date').equals(date).toArray()

export const saveDiary = (draft: Draft<Diary>, id?: ID) => upsert(db.diaries, draft, id)

export const removeDiary = (id: ID) => db.diaries.delete(id)

/* ---------------- 聖地・遠征 ---------------- */

export const listPlaces = () => db.places.orderBy('visitedOn').reverse().toArray()

export const savePlace = (draft: Draft<Place>, id?: ID) => upsert(db.places, draft, id)

export const removePlace = (id: ID) => db.places.delete(id)

/* ---------------- 設定 ---------------- */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}
