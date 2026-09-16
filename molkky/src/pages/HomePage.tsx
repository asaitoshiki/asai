import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, SectionTitle } from '../components/ui'
import { summarizeGame } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

export const HomePage = () => {
  const navigate = useNavigate()
  const games = useAppStore((state) => state.games)
  const ongoing = games.filter((game) => game.finishedAt === null)
  const recent = games
    .filter((game) => game.finishedAt !== null)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-amber-400">MÖLKKY NOTE</p>
        <h1 className="text-2xl font-bold">モルックノート</h1>
      </header>

      <Button className="w-full py-4 text-lg" onClick={() => navigate('/games/new')}>
        新しい試合をはじめる
      </Button>

      {ongoing.length > 0 && (
        <section>
          <SectionTitle>進行中の試合</SectionTitle>
          <div className="space-y-2">
            {ongoing.map((game) => (
              <Link key={game.id} to={`/games/${game.id}`} className="block">
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{game.entries.map((entry) => entry.name).join(' vs ')}</p>
                    <p className="text-xs text-slate-400">{game.throws.length} 投目まで記録済み</p>
                  </div>
                  <span className="text-amber-400">再開 ▸</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <SectionTitle>最近の試合</SectionTitle>
          <Link to="/history" className="mb-2 text-xs font-bold text-amber-400">
            すべて見る
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState>まだ試合の記録がありません</EmptyState>
        ) : (
          <div className="space-y-2">
            {recent.map((game) => {
              const summary = summarizeGame(game)
              return (
                <Card key={game.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">🏅 {summary.winnerName ?? '勝者なし'}</p>
                    <p className="tabular text-xs text-slate-400">
                      {summary.lines.map((line) => `${line.name} ${line.score}`).join(' / ')}
                    </p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Date(game.finishedAt!).toLocaleDateString('ja-JP')}
                  </time>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/practice">
          <Card className="h-full text-center">
            <p className="text-2xl">🎽</p>
            <p className="mt-1 text-sm font-bold">的当て練習</p>
          </Card>
        </Link>
        <Link to="/rules">
          <Card className="h-full text-center">
            <p className="text-2xl">📖</p>
            <p className="mt-1 text-sm font-bold">ルールを見る</p>
          </Card>
        </Link>
      </section>
    </div>
  )
}
