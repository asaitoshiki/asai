import { Button, Card, EmptyState } from '../components/ui'
import { summarizeGame } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

export const HistoryPage = () => {
  const games = useAppStore((state) => state.games)
  const deleteGame = useAppStore((state) => state.deleteGame)
  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">試合履歴</h1>

      {sorted.length === 0 ? (
        <EmptyState>まだ試合の記録がありません</EmptyState>
      ) : (
        sorted.map((game) => {
          const summary = summarizeGame(game)
          return (
            <Card key={game.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="font-bold">
                  {game.finishedAt === null ? '進行中' : `🏅 ${summary.winnerName ?? '勝者なし'}`}
                </p>
                <time className="text-xs text-slate-500">
                  {new Date(game.createdAt).toLocaleString('ja-JP')}
                </time>
              </div>
              <ul className="space-y-1">
                {summary.lines.map((line) => (
                  <li key={line.name} className="flex justify-between text-sm">
                    <span className={line.eliminated ? 'text-rose-400' : ''}>
                      {line.name}
                      {line.eliminated && '（失格）'}
                    </span>
                    <span className="tabular font-bold">{line.score}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{game.throws.length} 投</span>
                <Button
                  variant="danger"
                  className="px-3 py-1 text-xs"
                  onClick={() => deleteGame(game.id)}
                >
                  削除
                </Button>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
