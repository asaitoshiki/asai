import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SectionTitle, TextInput } from '../components/ui'
import { EntryBuilder } from '../components/EntryBuilder'
import { buildEntries, emptyConfig, isPlayable } from '../domain/entryConfig'
import { DEFAULT_RULES } from '../domain/rules'
import type { TournamentFormat } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

const FORMATS: { value: TournamentFormat; label: string; note: string }[] = [
  { value: 'roundRobin', label: '総当たり', note: '全員と 1 回ずつ対戦して順位表を作る' },
  { value: 'knockout', label: 'トーナメント', note: '勝ち上がり式。人数が半端な枠は不戦勝' },
]

export const TournamentSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const createTournament = useAppStore((state) => state.createTournament)

  const [name, setName] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('roundRobin')
  const [config, setConfig] = useState({ ...emptyConfig, teamCount: 4 })

  const entries = buildEntries(config, members)
  const ready = isPlayable(entries) && name.trim() !== ''

  const create = () =>
    navigate(`/tournaments/${createTournament(name, format, entries, DEFAULT_RULES)}`)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">大会をつくる</h1>

      <section>
        <SectionTitle>大会名</SectionTitle>
        <TextInput
          value={name}
          placeholder="例：春の社内モルック大会"
          onChange={(event) => setName(event.target.value)}
        />
      </section>

      <section>
        <SectionTitle>方式</SectionTitle>
        <div className="space-y-2">
          {FORMATS.map((item) => (
            <button
              key={item.value}
              className={`w-full rounded-2xl border p-4 text-left ${
                format === item.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-800 bg-slate-900/70'
              }`}
              onClick={() => setFormat(item.value)}
            >
              <p className="font-bold">{item.label}</p>
              <p className="text-xs text-slate-400">{item.note}</p>
            </button>
          ))}
        </div>
      </section>

      <EntryBuilder config={config} onChange={setConfig} maxTeams={8} />

      <Button className="w-full py-4 text-lg" disabled={!ready} onClick={create}>
        {ready ? '対戦表をつくる' : '大会名と 2 組以上の参加者が必要です'}
      </Button>
    </div>
  )
}
