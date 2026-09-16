import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from '../../components/AppShell'
import { Fab } from '../../components/Fab'
import { EmptyState } from '../../components/EmptyState'
import { OshiPicker } from '../../components/OshiPicker'
import { StatTile } from '../../components/StatTile'
import { GoodsForm } from './GoodsForm'
import { GoodsThumb } from './GoodsThumb'
import { listGoods, listOshi } from '../../db/queries'
import { GOODS_CATEGORY_LABEL, type Goods, type GoodsCategory, type ID } from '../../db/schema'
import { formatNumber } from '../../lib/money'

export function GoodsPage() {
  const [oshiId, setOshiId] = useState<ID>()
  const [editing, setEditing] = useState<Goods | 'new'>()

  const oshiList = useLiveQuery(listOshi, [], [])
  const goods = useLiveQuery(listGoods, [], [])

  const filtered = goods.filter((item) => !oshiId || item.oshiId === oshiId)
  const totalCount = filtered.reduce((sum, item) => sum + item.count, 0)

  const groups = useMemo(() => {
    const map = new Map<GoodsCategory, Goods[]>()
    for (const item of filtered) {
      const list = map.get(item.category)
      if (list) list.push(item)
      else map.set(item.category, [item])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <AppShell title="グッズ" back>
      <div className="space-y-4">
        <OshiPicker oshiList={oshiList} value={oshiId} onChange={setOshiId} allLabel="すべての推し" />

        <div className="grid grid-cols-2 gap-2">
          <StatTile label="登録数" value={formatNumber(filtered.length)} unit="種類" />
          <StatTile label="合計" value={formatNumber(totalCount)} unit="点" />
        </div>

        {groups.length === 0 ? (
          <EmptyState emoji="🛍️" title="まだグッズがありません" hint="右下のボタンから登録できます" />
        ) : (
          groups.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-xs font-bold text-muted">{GOODS_CATEGORY_LABEL[category]}</h2>
              <ul className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="card w-full overflow-hidden text-left"
                    >
                      <GoodsThumb photoId={item.photoId} />
                      <div className="p-2.5">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.count} 点
                          {item.acquiredOn && ` ・ ${item.acquiredOn}`}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Fab label="グッズを追加" onClick={() => setEditing('new')} />

      {editing && (
        <GoodsForm
          goods={editing === 'new' ? undefined : editing}
          oshiList={oshiList}
          onClose={() => setEditing(undefined)}
        />
      )}
    </AppShell>
  )
}
