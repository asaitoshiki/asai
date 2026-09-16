import { useState } from 'react'
import { Button, Card, SectionTitle, TextInput } from './ui'
import { TEAM_LABELS, teamIndexOf } from '../domain/entryConfig'
import type { EntryConfig } from '../domain/entryConfig'
import { useAppStore } from '../store/useAppStore'

type Props = {
  config: EntryConfig
  onChange: (config: EntryConfig) => void
  maxTeams?: number
}

export const EntryBuilder = ({ config, onChange, maxTeams = 4 }: Props) => {
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const [newName, setNewName] = useState('')

  const toggle = (memberId: string) =>
    onChange({
      ...config,
      selected: config.selected.includes(memberId)
        ? config.selected.filter((id) => id !== memberId)
        : [...config.selected, memberId],
    })

  const add = () => {
    const name = newName.trim()
    if (name === '') return
    const member = addMember(name)
    onChange({ ...config, selected: [...config.selected, member.id] })
    setNewName('')
  }

  return (
    <>
      <section>
        <SectionTitle>形式</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {(['solo', 'team'] as const).map((mode) => (
            <Button
              key={mode}
              variant={config.mode === mode ? 'primary' : 'ghost'}
              onClick={() => onChange({ ...config, mode })}
            >
              {mode === 'solo' ? '個人戦' : 'チーム戦'}
            </Button>
          ))}
        </div>
        {config.mode === 'team' && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">チーム数</span>
            {Array.from({ length: maxTeams - 1 }, (_, index) => index + 2).map((count) => (
              <Button
                key={count}
                variant={config.teamCount === count ? 'primary' : 'ghost'}
                className="px-3 py-2 text-sm"
                onClick={() => onChange({ ...config, teamCount: count })}
              >
                {count}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>参加者を選ぶ（{config.selected.length} 人）</SectionTitle>
        <div className="mb-3 flex gap-2">
          <TextInput
            value={newName}
            placeholder="名前を入力して追加"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && add()}
          />
          <Button onClick={add}>追加</Button>
        </div>
        <div className="space-y-2">
          {members.map((member) => {
            const picked = config.selected.includes(member.id)
            return (
              <Card
                key={member.id}
                className={`flex items-center justify-between py-3 ${picked ? 'border-amber-500/60' : ''}`}
              >
                <button className="flex-1 text-left font-bold" onClick={() => toggle(member.id)}>
                  <span className="mr-2 text-amber-400">{picked ? '●' : '○'}</span>
                  {member.name}
                </button>
                {picked && config.mode === 'team' && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {TEAM_LABELS.slice(0, config.teamCount).map((label, team) => (
                      <button
                        key={label}
                        className={`h-8 w-8 rounded-lg text-sm font-bold ${
                          teamIndexOf(config, member.id) === team
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        onClick={() =>
                          onChange({
                            ...config,
                            teamOf: { ...config.teamOf, [member.id]: team },
                          })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>
    </>
  )
}
