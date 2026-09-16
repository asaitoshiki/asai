import { db } from './db'
import type { Diary, Expense, Goods, Oshi, OshiEvent, Photo, Place } from './schema'
import { blobToDataUrl, dataUrlToBlob } from '../lib/image'

const FORMAT = 'oshikatsu-backup'
const VERSION = 1

/** 画像 Blob は JSON に載せられないので data URL に変換して持ち出す */
type Serialized<T> = Omit<T, 'avatar' | 'blob' | 'thumb'> & {
  avatar?: string
  blob?: string
  thumb?: string
}

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  oshi: Serialized<Oshi>[]
  events: OshiEvent[]
  photos: Serialized<Photo>[]
  expenses: Expense[]
  goods: Goods[]
  diaries: Diary[]
  places: Place[]
}

export async function exportBackup(): Promise<Blob> {
  const [oshi, events, photos, expenses, goods, diaries, places] = await Promise.all([
    db.oshi.toArray(),
    db.events.toArray(),
    db.photos.toArray(),
    db.expenses.toArray(),
    db.goods.toArray(),
    db.diaries.toArray(),
    db.places.toArray(),
  ])

  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    oshi: await Promise.all(
      oshi.map(async ({ avatar, ...rest }) => ({
        ...rest,
        avatar: avatar ? await blobToDataUrl(avatar) : undefined,
      })),
    ),
    events,
    photos: await Promise.all(
      photos.map(async ({ blob, thumb, ...rest }) => ({
        ...rest,
        blob: await blobToDataUrl(blob),
        thumb: await blobToDataUrl(thumb),
      })),
    ),
    expenses,
    goods,
    diaries,
    places,
  }

  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

export function downloadBackup(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `oshikatsu-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** バックアップで現在のデータを完全に置き換える */
export async function importBackup(file: File) {
  const backup = JSON.parse(await file.text()) as Backup
  if (backup.format !== FORMAT) {
    throw new Error('このアプリのバックアップファイルではありません')
  }

  const oshi: Oshi[] = await Promise.all(
    backup.oshi.map(async ({ avatar, ...rest }) => ({
      ...rest,
      avatar: avatar ? await dataUrlToBlob(avatar) : undefined,
    })),
  )
  const photos: Photo[] = await Promise.all(
    backup.photos.map(async ({ blob, thumb, ...rest }) => ({
      ...rest,
      blob: await dataUrlToBlob(blob!),
      thumb: await dataUrlToBlob(thumb!),
    })),
  )

  await db.transaction(
    'rw',
    [db.oshi, db.events, db.photos, db.expenses, db.goods, db.diaries, db.places],
    async () => {
      await Promise.all([
        db.oshi.clear(),
        db.events.clear(),
        db.photos.clear(),
        db.expenses.clear(),
        db.goods.clear(),
        db.diaries.clear(),
        db.places.clear(),
      ])
      await Promise.all([
        db.oshi.bulkAdd(oshi),
        db.events.bulkAdd(backup.events),
        db.photos.bulkAdd(photos),
        db.expenses.bulkAdd(backup.expenses),
        db.goods.bulkAdd(backup.goods),
        db.diaries.bulkAdd(backup.diaries),
        db.places.bulkAdd(backup.places),
      ])
    },
  )
}

export async function clearAll() {
  await db.transaction(
    'rw',
    [db.oshi, db.events, db.photos, db.expenses, db.goods, db.diaries, db.places, db.settings],
    async () => {
      await Promise.all([
        db.oshi.clear(),
        db.events.clear(),
        db.photos.clear(),
        db.expenses.clear(),
        db.goods.clear(),
        db.diaries.clear(),
        db.places.clear(),
        db.settings.clear(),
      ])
    },
  )
}

/** 端末の保存容量の使用状況。IndexedDB は空き容量に上限があるため設定画面で見せる */
export async function estimateStorage() {
  if (!navigator.storage?.estimate) return undefined
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
