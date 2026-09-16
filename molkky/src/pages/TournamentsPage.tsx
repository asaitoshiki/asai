import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState } from '../components/ui'
import { championOf } from '../domain/tournament'
import { useAppStore } from '../store/useAppStore'

const FORMAT_LABEL = { roundRobin: '総当たり', knockout: 'トーナメント' } as const

export const TournamentsPage = () => {
  const navigate = useNavigate()
  const tournaments = useAppStore((state) => state.tournaments)
  const games = useAppStore((state) => state.games)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">大会</h1>

      <Button className="w-full" onClick={() => navigate('/tournaments/new')}>
        大会をつくる
      </Button>

      {tournaments.length === 0 ? (
        <EmptyState>総当たり戦やトーナメントの組み合わせを自動で作れます</EmptyState>
      ) : (
        [...tournaments]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((tournament) => {
            const champion = championOf(tournament, games)
            const done = tournament.matches.filter((match) => match.winnerEntryId !== null).length
            return (
              <Link key={tournament.id} to={`/tournaments/${tournament.id}`} className="block">
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{tournament.name}</p>
                    <p className="text-xs text-slate-400">
                      {FORMAT_LABEL[tournament.format]}／{tournament.entries.length} 組／
                      {done} / {tournament.matches.length} 試合消化
                    </p>
                  </div>
                  <span className="text-sm text-amber-400">
                    {champion === null ? '開催中 ▸' : `🏆 ${champion.name}`}
                  </span>
                </Card>
              </Link>
            )
          })
      )}
    </div>
  )
}
