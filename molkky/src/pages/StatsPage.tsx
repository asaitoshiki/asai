import { useState } from 'react'
import { Card, EmptyState, SectionTitle } from '../components/ui'
import { PinHitChart } from '../components/PinHitChart'
import { computeMemberStats } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

const percent = (value: number) => `${(value * 100).toFixed(0)}%`

export const StatsPage = () => {
  const members = useAppStore((state) => state.members)
  const games = useAppStore((state) => state.games)
  const [openId, setOpenId] = useState<string | null>(null)

  const stats = computeMemberStats(games, members)
    .filter((stat) => stat.games > 0)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">戦績</h1>

      {stats.length === 0 ? (
        <EmptyState>試合を 1 つ終えると成績が集計されます</EmptyState>
      ) : (
        <>
          <SectionTitle>勝率ランキング</SectionTitle>
          {stats.map((stat, rank) => {
            const open = openId === stat.member.id
            return (
              <Card key={stat.member.id}>
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpenId(open ? null : stat.member.id)}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="tabular w-6 text-sm text-slate-500">{rank + 1}.</span>
                    <span className="font-bold">{stat.member.name}</span>
                  </span>
                  <span className="tabular text-sm text-slate-400">
                    {stat.wins}勝 / {stat.games}試合{' '}
                    <span className="text-lg font-bold text-amber-400">
                      {percent(stat.winRate)}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      {(
                        [
                          ['総投数', `${stat.throws}`, '投'],
                          ['平均得点', stat.averagePoints.toFixed(1), '点/投'],
                          ['ミス率', percent(stat.missRate), ''],
                          ['1 本倒し', `${stat.singleHits}`, '回'],
                          ['複数本倒し', `${stat.multiHits}`, '回'],
                          ['50 点超過', `${stat.overshoots}`, '回'],
                        ] as const
                      ).map(([label, value, unit]) => (
                        <div key={label} className="rounded-xl bg-slate-950/60 py-2">
                          <dt className="text-[11px] text-slate-400">{label}</dt>
                          <dd className="tabular text-lg font-bold">
                            {value}
                            <span className="ml-0.5 text-[11px] font-normal text-slate-400">
                              {unit}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <PinHitChart hits={stat.pinHits} />
                  </div>
                )}
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
