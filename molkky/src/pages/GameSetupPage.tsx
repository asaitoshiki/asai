import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextInput } from '../components/ui'
import { EntryBuilder } from '../components/EntryBuilder'
import { buildEntries, emptyConfig, isPlayable } from '../domain/entryConfig'
import { DEFAULT_RULES } from '../domain/rules'
import { useAppStore } from '../store/useAppStore'

export const GameSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const createGame = useAppStore((state) => state.createGame)

  const [config, setConfig] = useState(emptyConfig)
  const [rules, setRules] = useState(DEFAULT_RULES)

  const entries = buildEntries(config, members)
  const ready = isPlayable(entries)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">試合の設定</h1>

      <EntryBuilder config={config} onChange={setConfig} />

      <details className="rounded-2xl border border-slate-800 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-400">詳細ルール設定</summary>
        <div className="mt-3 space-y-3">
          {(
            [
              ['targetScore', '目標点'],
              ['penaltyScore', '超過時に戻る点'],
              ['maxMisses', '失格になる連続ミス数'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              {label}
              <TextInput
                type="number"
                className="w-24 text-right"
                value={rules[key]}
                onChange={(event) =>
                  setRules((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
        </div>
      </details>

      <Button
        className="w-full py-4 text-lg"
        disabled={!ready}
        onClick={() => navigate(`/games/${createGame(entries, rules, null)}`)}
      >
        {ready ? '試合開始' : '2 組以上になるよう選んでください'}
      </Button>
    </div>
  )
}
