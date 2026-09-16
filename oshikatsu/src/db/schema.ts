// アプリ全体で使うデータ型の定義。すべて端末内の IndexedDB に保存する。

export type ID = string

/** 共通のタイムスタンプ。作成日時・更新日時はすべてのレコードが持つ */
export interface Stamped {
  createdAt: number
  updatedAt: number
}

export interface Link {
  label: string
  url: string
}

/** 推し本人。テーマカラーはカレンダーのドットやペンライト画面にも使う */
export interface Oshi extends Stamped {
  id: ID
  name: string
  kana: string
  groupName: string
  color: string
  avatar?: Blob
  /** MM-DD 形式。年は分からないことが多いので birthYear と分けて持つ */
  birthday?: string
  birthYear?: number
  /** 推し始めた日 YYYY-MM-DD */
  startedOn?: string
  memo: string
  links: Link[]
  sortOrder: number
}

export const EVENT_TYPES = [
  'live',
  'event',
  'release',
  'broadcast',
  'birthday',
  'anniversary',
  'goods',
  'deadline',
  'other',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  live: 'ライブ',
  event: 'イベント',
  release: 'リリース',
  broadcast: '配信・放送',
  birthday: '誕生日',
  anniversary: '記念日',
  goods: 'グッズ',
  deadline: '締切',
  other: 'その他',
}

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  live: '🎤',
  event: '🎟️',
  release: '💿',
  broadcast: '📺',
  birthday: '🎂',
  anniversary: '💐',
  goods: '🛍️',
  deadline: '⏰',
  other: '📌',
}

export interface OshiEvent extends Stamped {
  id: ID
  oshiId?: ID
  title: string
  type: EventType
  /** YYYY-MM-DD */
  date: string
  /** 複数日にまたがる予定の終了日 */
  endDate?: string
  /** HH:mm */
  startTime?: string
  endTime?: string
  venue: string
  memo: string
  /** 記念日のように毎年繰り返す予定か */
  repeatYearly: boolean
  done: boolean
}

export const PHOTO_KINDS = ['cheki', 'photo', 'goods', 'ticket'] as const
export type PhotoKind = (typeof PHOTO_KINDS)[number]

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  cheki: 'チェキ',
  photo: '写真',
  goods: 'グッズ',
  ticket: 'チケット',
}

export interface Photo extends Stamped {
  id: ID
  oshiId?: ID
  eventId?: ID
  kind: PhotoKind
  /** 原本。表示は基本 thumb を使い、拡大時だけ blob を読む */
  blob: Blob
  thumb: Blob
  width: number
  height: number
  /** YYYY-MM-DD */
  takenOn: string
  caption: string
  tags: string[]
  favorite: boolean
}

export const EXPENSE_CATEGORIES = [
  'ticket',
  'goods',
  'travel',
  'media',
  'stream',
  'food',
  'gift',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  ticket: 'チケット',
  goods: 'グッズ',
  travel: '遠征・交通',
  media: 'CD・DVD',
  stream: '配信・課金',
  food: '飲食',
  gift: 'プレゼント',
  other: 'その他',
}

export const EXPENSE_CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  ticket: '🎟️',
  goods: '🛍️',
  travel: '🚄',
  media: '💿',
  stream: '📱',
  food: '🍰',
  gift: '🎁',
  other: '✨',
}

export interface Expense extends Stamped {
  id: ID
  oshiId?: ID
  eventId?: ID
  /** YYYY-MM-DD */
  date: string
  amount: number
  category: ExpenseCategory
  memo: string
}

export const GOODS_CATEGORIES = [
  'acrylic',
  'penlight',
  'photo',
  'media',
  'clothing',
  'plush',
  'badge',
  'other',
] as const
export type GoodsCategory = (typeof GOODS_CATEGORIES)[number]

export const GOODS_CATEGORY_LABEL: Record<GoodsCategory, string> = {
  acrylic: 'アクスタ・アクキー',
  penlight: 'ペンライト',
  photo: 'ブロマイド・生写真',
  media: 'CD・DVD・雑誌',
  clothing: '衣類・タオル',
  plush: 'ぬいぐるみ',
  badge: '缶バッジ',
  other: 'その他',
}

export interface Goods extends Stamped {
  id: ID
  oshiId?: ID
  name: string
  category: GoodsCategory
  count: number
  /** YYYY-MM-DD */
  acquiredOn?: string
  photoId?: ID
  memo: string
}

/** 日記の気分。1=しんどい 〜 5=最高 */
export type Mood = 1 | 2 | 3 | 4 | 5

export const MOOD_EMOJI: Record<Mood, string> = {
  1: '😢',
  2: '😔',
  3: '😌',
  4: '😊',
  5: '🥰',
}

export interface Diary extends Stamped {
  id: ID
  oshiId?: ID
  /** YYYY-MM-DD */
  date: string
  title: string
  body: string
  mood: Mood
  photoIds: ID[]
}

/** 聖地巡礼・遠征の記録 */
export interface Place extends Stamped {
  id: ID
  oshiId?: ID
  name: string
  address: string
  /** YYYY-MM-DD */
  visitedOn?: string
  memo: string
  photoIds: ID[]
}

export interface Setting {
  key: string
  value: unknown
}

/** 推しのテーマカラー候補。ペンライトカラーとしてよく使われる色を並べている */
export const OSHI_COLORS = [
  '#ec4899',
  '#f43f5e',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ffffff',
  '#64748b',
]
