import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { computeGameState } from '../domain/game'
import { PIN_NUMBERS, pointsOf } from '../domain/rules'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

export const GamePage = () => {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  const members = useAppStore((state) => state.members)
  const recordThrow = useAppStore((state) => state.recordThrow)
  const undoThrow = useAppStore((state) => state.undoThrow)
  const [selectedPins, setSelectedPins] = useState<number[]>([])

  const state = computeGameState(game)
  const entryOf = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '？'

  const submit = (pins: number[]) => {
    recordThrow(game.id, pins)
    setSelectedPins([])
  }

  const togglePin = (pin: number) =>
    setSelectedPins((current) =>
      current.includes(pin) ? current.filter((value) => value !== pin) : [...current, pin],
    )

  const points = pointsOf(selectedPins)
  const currentState = state.entries.find((entry) => entry.entryId === state.currentEntryId)
  const overshoot = currentState !== undefined && currentState.score + points > game.rules.targetScore

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="safe-top flex items-center justify-between px-4 pt-3">
        <Link to="/" className="text-sm text-slate-400">
          ← 中断して戻る
        </Link>
        <span className="text-sm font-bold text-slate-400">第 {state.round} ラウンド</span>
        <button
          className="text-sm text-slate-400 disabled:opacity-30"
          disabled={game.throws.length === 0}
          onClick={() => undoThrow(game.id)}
        >
          1 投取消
        </button>
      </header>

      <section className="space-y-2 px-4 py-4">
        {state.entries.map((entryState) => {
          const entry = entryOf(entryState.entryId)
          const active = entryState.entryId === state.currentEntryId
          return (
            <Card
              key={entry.id}
              className={`py-3 ${active ? 'border-amber-500 bg-amber-500/10' : ''} ${
                entryState.eliminated ? 'opacity-40' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-bold">
                    {entry.name}
                    {entryState.eliminated && (
                      <span className="ml-2 text-xs text-rose-400">失格</span>
                    )}
                  </p>
                  {entry.memberIds.length > 1 && (
                    <p className="text-xs text-slate-400">
                      {entry.memberIds.map(memberName).join('・')}
                    </p>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500">
                    {'✕'.repeat(entryState.consecutiveMisses)}
                  </span>
                  <span className="tabular text-3xl font-bold">{entryState.score}</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${(entryState.score / game.rules.targetScore) * 100}%` }}
                />
              </div>
            </Card>
          )
        })}
      </section>

      <ThrowLog game={game} entryName={(entryId) => entryOf(entryId).name} />

      {state.finished ? (
        <ResultPanel
          winnerName={state.winnerEntryId === null ? null : entryOf(state.winnerEntryId).name}
          onHome={() => navigate('/')}
          onUndo={() => undoThrow(game.id)}
        />
      ) : (
        <section className="mt-auto space-y-3 px-4 pb-6">
          <div className="text-center">
            <p className="text-sm text-slate-400">いまの投球者</p>
            <p className="text-xl font-bold text-amber-400">
              {entryOf(state.currentEntryId!).name}
              {entryOf(state.currentEntryId!).memberIds.length > 1 && (
                <span className="ml-2 text-base text-slate-200">
                  {memberName(state.currentMemberId!)}
                </span>
              )}
            </p>
            <p className="tabular mt-1 text-xs text-slate-500">
              あと {game.rules.targetScore - currentState!.score} 点
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PIN_NUMBERS.map((pin) => (
              <button
                key={pin}
                className={`tabular rounded-xl py-4 text-xl font-bold transition-colors ${
                  selectedPins.includes(pin)
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-100'
                }`}
                onClick={() => togglePin(pin)}
              >
                {pin}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400">
            倒したスキットルをタップ ／ 得点{' '}
            <span className={`tabular text-lg font-bold ${overshoot ? 'text-rose-400' : 'text-amber-400'}`}>
              {points}
            </span>
            {overshoot && <span className="ml-2 text-xs text-rose-400">超過 → {game.rules.penaltyScore} 点に戻ります</span>}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => submit([])}>
              ミス（0 点）
            </Button>
            <Button disabled={selectedPins.length === 0} onClick={() => submit(selectedPins)}>
              記録する
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

/** 直近の投球を新しい順に並べる。取り消し前の確認に使う。 */
const ThrowLog = ({
  game,
  entryName,
}: {
  game: Game
  entryName: (entryId: string) => string
}) => (
  <section className="flex-1 overflow-y-auto px-4">
    <ul className="space-y-1 text-sm">
      {[...game.throws]
        .reverse()
        .slice(0, 8)
        .map((record, index) => (
          <li
            key={game.throws.length - index}
            className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-1.5"
          >
            <span className="tabular w-8 text-xs text-slate-500">
              {game.throws.length - index}
            </span>
            <span className="flex-1 text-slate-300">{entryName(record.entryId)}</span>
            <span className="text-xs text-slate-500">
              {record.pins.length === 0 ? 'ミス' : record.pins.join('・')}
            </span>
            <span className="tabular w-10 text-right font-bold text-amber-400">
              +{pointsOf(record.pins)}
            </span>
          </li>
        ))}
    </ul>
  </section>
)

const ResultPanel = ({
  winnerName,
  onHome,
  onUndo,
}: {
  winnerName: string | null
  onHome: () => void
  onUndo: () => void
}) => (
  <section className="mt-auto space-y-3 px-4 pb-8 text-center">
    <p className="text-5xl">🏆</p>
    <p className="text-2xl font-bold text-amber-400">{winnerName ?? '勝者なし'}</p>
    <p className="text-sm text-slate-400">試合終了。記録は戦績に反映されます。</p>
    <div className="grid grid-cols-2 gap-2">
      <Button variant="ghost" onClick={onUndo}>
        取り消して続行
      </Button>
      <Button onClick={onHome}>ホームへ</Button>
    </div>
  </section>
)
