import { useState } from 'react'
import { Button, Card, EmptyState, TextInput } from '../components/ui'
import { computeMemberStats } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

export const MembersPage = () => {
  const members = useAppStore((state) => state.members)
  const games = useAppStore((state) => state.games)
  const addMember = useAppStore((state) => state.addMember)
  const renameMember = useAppStore((state) => state.renameMember)
  const removeMember = useAppStore((state) => state.removeMember)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const stats = new Map(computeMemberStats(games, members).map((stat) => [stat.member.id, stat]))

  const add = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    addMember(trimmed)
    setName('')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">メンバー</h1>

      <div className="flex gap-2">
        <TextInput
          value={name}
          placeholder="名前を追加"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
        />
        <Button onClick={add}>追加</Button>
      </div>

      {members.length === 0 ? (
        <EmptyState>よく遊ぶメンバーを登録しておくと試合の準備が早くなります</EmptyState>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const stat = stats.get(member.id)!
            return (
              <Card key={member.id} className="flex items-center gap-3">
                {editing === member.id ? (
                  <TextInput
                    autoFocus
                    defaultValue={member.name}
                    onBlur={(event) => {
                      renameMember(member.id, event.target.value)
                      setEditing(null)
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                  />
                ) : (
                  <button className="flex-1 text-left" onClick={() => setEditing(member.id)}>
                    <p className="font-bold">{member.name}</p>
                    <p className="tabular text-xs text-slate-400">
                      {stat.games} 試合 / {stat.wins} 勝 / 勝率{' '}
                      {(stat.winRate * 100).toFixed(0)}%
                    </p>
                  </button>
                )}
                <Button
                  variant="danger"
                  className="px-3 py-2 text-sm"
                  onClick={() => removeMember(member.id)}
                >
                  削除
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
