import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, SectionTitle } from '../components/ui'
import { championOf, computeStandings } from '../domain/tournament'
import type { Tournament, TournamentMatch } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

export const TournamentDetailPage = () => {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const tournament = useAppStore((state) =>
    state.tournaments.find((item) => item.id === tournamentId),
  )!
  const games = useAppStore((state) => state.games)
  const createGame = useAppStore((state) => state.createGame)
  const deleteTournament = useAppStore((state) => state.deleteTournament)

  const nameOf = (entryId: string | null) =>
    entryId === null ? '—' : (tournament.entries.find((entry) => entry.id === entryId)?.name ?? '—')

  const openMatch = (match: TournamentMatch) => {
    const existing = match.gameId
    const gameId =
      existing ??
      createGame(
        match.entryIds.map((entryId) => tournament.entries.find((entry) => entry.id === entryId)!),
        tournament.rules,
        { tournamentId: tournament.id, matchId: match.id },
      )
    navigate(`/games/${gameId}`)
  }

  const champion = championOf(tournament, games)
  const rounds = [...new Set(tournament.matches.map((match) => match.round))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">{tournament.name}</h1>
        <p className="text-xs text-slate-400">
          {tournament.format === 'roundRobin' ? '総当たり' : 'トーナメント'}／
          {tournament.entries.length} 組
        </p>
      </header>

      {champion && (
        <Card className="text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-1 text-lg font-bold text-amber-400">優勝：{champion.name}</p>
        </Card>
      )}

      {tournament.format === 'roundRobin' && <Standings tournament={tournament} />}

      {rounds.map((round) => (
        <section key={round}>
          <SectionTitle>
            {tournament.format === 'knockout' ? roundLabel(round, rounds.length) : `第 ${round} 節`}
          </SectionTitle>
          <div className="space-y-2">
            {tournament.matches
              .filter((match) => match.round === round)
              .map((match) => {
                const playable = match.entryIds.every((entryId) => entryId !== null)
                const decided = match.winnerEntryId !== null
                return (
                  <Card key={match.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-bold">
                        {nameOf(match.entryIds[0])} vs {nameOf(match.entryIds[1] ?? null)}
                      </p>
                      {decided && (
                        <p className="text-xs text-amber-400">勝者 {nameOf(match.winnerEntryId)}</p>
                      )}
                    </div>
                    <Button
                      variant={decided ? 'ghost' : 'primary'}
                      className="px-3 py-2 text-sm"
                      disabled={!playable}
                      onClick={() => openMatch(match)}
                    >
                      {match.gameId === null ? '試合開始' : decided ? '記録を見る' : '再開'}
                    </Button>
                  </Card>
                )
              })}
          </div>
        </section>
      ))}

      <Button
        variant="danger"
        className="w-full"
        onClick={() => {
          deleteTournament(tournament.id)
          navigate('/tournaments')
        }}
      >
        この大会を削除する
      </Button>
    </div>
  )
}

/** 決勝から数えたラウンド名 */
const roundLabel = (round: number, total: number) => {
  const fromFinal = total - round
  return ['決勝', '準決勝', '準々決勝'][fromFinal] ?? `${round} 回戦`
}

const Standings = ({ tournament }: { tournament: Tournament }) => {
  const games = useAppStore((state) => state.games)
  const standings = computeStandings(tournament, games)

  return (
    <section>
      <SectionTitle>順位表</SectionTitle>
      <Card className="overflow-x-auto p-0">
        <table className="tabular w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-3 py-2 text-left font-normal">組</th>
              <th className="px-2 py-2 text-right font-normal">試合</th>
              <th className="px-2 py-2 text-right font-normal">勝</th>
              <th className="px-2 py-2 text-right font-normal">負</th>
              <th className="px-3 py-2 text-right font-normal">得失点</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.entry.id} className="border-b border-slate-800/50 last:border-0">
                <td className="px-3 py-2 font-bold">{standing.entry.name}</td>
                <td className="px-2 py-2 text-right">{standing.played}</td>
                <td className="px-2 py-2 text-right font-bold text-amber-400">{standing.wins}</td>
                <td className="px-2 py-2 text-right">{standing.losses}</td>
                <td className="px-3 py-2 text-right">
                  {standing.pointsFor - standing.pointsAgainst > 0 ? '+' : ''}
                  {standing.pointsFor - standing.pointsAgainst}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  )
}
