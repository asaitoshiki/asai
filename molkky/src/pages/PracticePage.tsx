import { useState } from 'react'
import { Button, Card, EmptyState, SectionTitle } from '../components/ui'
import { PIN_NUMBERS } from '../domain/rules'
import { useAppStore } from '../store/useAppStore'

const DISTANCES = [3.5, 4, 5]

/** 狙ったスキットルに当てられたかだけを記録する簡易練習モード。 */
export const PracticePage = () => {
  const members = useAppStore((state) => state.members)
  const practices = useAppStore((state) => state.practices)
  const addPractice = useAppStore((state) => state.addPractice)
  const removePractice = useAppStore((state) => state.removePractice)

  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [targetPin, setTargetPin] = useState(12)
  const [distance, setDistance] = useState(3.5)
  const [results, setResults] = useState<boolean[]>([])

  const hits = results.filter(Boolean).length
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? '？'

  const save = () => {
    addPractice({ memberId, targetPin, distance, results })
    setResults([])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">的当て練習</h1>

      {members.length === 0 ? (
        <EmptyState>先にメンバーを登録してください</EmptyState>
      ) : (
        <>
          <section>
            <SectionTitle>投げる人</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant={memberId === member.id ? 'primary' : 'ghost'}
                  className="px-3 py-2 text-sm"
                  onClick={() => setMemberId(member.id)}
                >
                  {member.name}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>狙うスキットル</SectionTitle>
            <div className="grid grid-cols-6 gap-2">
              {PIN_NUMBERS.map((pin) => (
                <Button
                  key={pin}
                  variant={targetPin === pin ? 'primary' : 'ghost'}
                  className="tabular px-0 py-3"
                  onClick={() => setTargetPin(pin)}
                >
                  {pin}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>距離</SectionTitle>
            <div className="flex gap-2">
              {DISTANCES.map((value) => (
                <Button
                  key={value}
                  variant={distance === value ? 'primary' : 'ghost'}
                  className="px-4 py-2 text-sm"
                  onClick={() => setDistance(value)}
                >
                  {value}m
                </Button>
              ))}
            </div>
          </section>

          <Card className="space-y-3 text-center">
            <p className="tabular text-3xl font-bold">
              {hits}
              <span className="text-base text-slate-400"> / {results.length} 投</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setResults((current) => [...current, false])}>
                はずれ
              </Button>
              <Button onClick={() => setResults((current) => [...current, true])}>命中</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="py-2 text-sm"
                disabled={results.length === 0}
                onClick={() => setResults((current) => current.slice(0, -1))}
              >
                1 投取消
              </Button>
              <Button
                className="py-2 text-sm"
                disabled={results.length === 0 || memberId === ''}
                onClick={save}
              >
                この練習を保存
              </Button>
            </div>
          </Card>
        </>
      )}

      <section>
        <SectionTitle>練習の記録</SectionTitle>
        {practices.length === 0 ? (
          <EmptyState>保存した練習がここに並びます</EmptyState>
        ) : (
          <div className="space-y-2">
            {[...practices]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((practice) => (
                <Card key={practice.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold">
                      {nameOf(practice.memberId)}／{practice.targetPin} 番・{practice.distance}m
                    </p>
                    <p className="tabular text-xs text-slate-400">
                      命中 {practice.results.filter(Boolean).length} / {practice.results.length}（
                      {(
                        (practice.results.filter(Boolean).length / practice.results.length) *
                        100
                      ).toFixed(0)}
                      %）
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    className="px-3 py-1 text-xs"
                    onClick={() => removePractice(practice.id)}
                  >
                    削除
                  </Button>
                </Card>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
