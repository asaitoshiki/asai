import { db, newId, stamp } from './db'
import type { Oshi, OshiEvent } from './schema'
import { addDays, monthStart, monthKey, todayISO } from '../lib/date'

/** 使い始めの画面が空にならないよう、設定画面から入れられるサンプル一式 */
export async function insertSampleData() {
  const today = todayISO()
  const thisMonth = monthStart(monthKey(today))

  const hana: Oshi = {
    id: newId(),
    name: 'ハナ',
    kana: 'はな',
    groupName: 'サンプルアイドル',
    color: '#ec4899',
    birthday: '07-07',
    birthYear: 2001,
    startedOn: addDays(today, -400),
    memo: 'はじめて現場に行ったときの笑顔が忘れられない。',
    links: [{ label: '公式サイト', url: 'https://example.com' }],
    sortOrder: 0,
    ...stamp(),
  }

  const sora: Oshi = {
    id: newId(),
    name: 'ソラ',
    kana: 'そら',
    groupName: 'サンプルアイドル',
    color: '#0ea5e9',
    birthday: '11-23',
    startedOn: addDays(today, -120),
    memo: '低音ボイスが好き。',
    links: [],
    sortOrder: 1,
    ...stamp(),
  }

  const events: OshiEvent[] = [
    {
      id: newId(),
      oshiId: hana.id,
      title: 'ワンマンライブ 2026',
      type: 'live',
      date: addDays(today, 12),
      startTime: '18:00',
      venue: 'Zepp サンプル',
      memo: '物販は 15:00 から',
      repeatYearly: false,
      done: false,
      ...stamp(),
    },
    {
      id: newId(),
      oshiId: sora.id,
      title: 'ニューシングル発売',
      type: 'release',
      date: addDays(today, 30),
      venue: '',
      memo: '',
      repeatYearly: false,
      done: false,
      ...stamp(),
    },
    {
      id: newId(),
      title: 'はじめて現場に行った日',
      type: 'anniversary',
      oshiId: hana.id,
      date: addDays(today, -400),
      venue: '',
      memo: '',
      repeatYearly: true,
      done: false,
      ...stamp(),
    },
  ]

  await db.transaction('rw', [db.oshi, db.events, db.expenses, db.diaries], async () => {
    await db.oshi.bulkAdd([hana, sora])
    await db.events.bulkAdd(events)
    await db.expenses.bulkAdd([
      {
        id: newId(),
        oshiId: hana.id,
        date: addDays(thisMonth, 2),
        amount: 8800,
        category: 'ticket',
        memo: 'ワンマンライブ チケット',
        ...stamp(),
      },
      {
        id: newId(),
        oshiId: hana.id,
        date: addDays(thisMonth, 5),
        amount: 3500,
        category: 'goods',
        memo: 'アクスタ・缶バッジ',
        ...stamp(),
      },
      {
        id: newId(),
        oshiId: sora.id,
        date: addDays(thisMonth, 9),
        amount: 12400,
        category: 'travel',
        memo: '新幹線往復',
        ...stamp(),
      },
    ])
    await db.diaries.add({
      id: newId(),
      oshiId: hana.id,
      date: addDays(today, -3),
      title: '特典会でお話しできた',
      body: '緊張して用意した言葉を半分も言えなかったけど、覚えていてくれてうれしかった。',
      mood: 5,
      photoIds: [],
      ...stamp(),
    })
  })
}
