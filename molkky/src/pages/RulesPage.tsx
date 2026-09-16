import { Card, SectionTitle } from '../components/ui'
import { INITIAL_FORMATION } from '../domain/rules'

const sections = [
  {
    title: '得点の数え方',
    items: [
      '1 本だけ倒したら、そのスキットルに書かれた数字がそのまま得点。',
      '2 本以上倒したら、倒した本数が得点（番号は関係なし）。',
      '1 本も倒せなければ 0 点。',
    ],
  },
  {
    title: '勝敗',
    items: [
      'ちょうど 50 点に到達した人（チーム）の勝ち。',
      '50 点を超えてしまったら 25 点に戻される。',
      '3 回連続で 0 点だと失格。',
    ],
  },
  {
    title: '投げ方',
    items: [
      '投擲ラインからスキットルの最前列までは 3.5m。',
      '下手投げ（アンダースロー）で投げる。',
      '投げ終わるまで投擲ラインを踏み越えない。',
    ],
  },
  {
    title: 'スキットルの立て直し',
    items: [
      '倒れたスキットルは、倒れたその場所で立て直す。',
      'そのため回を追うごとに散らばっていき、狙いが難しくなる。',
      '他のスキットルや物にもたれて完全に倒れていない場合は、倒したと数えない。',
    ],
  },
]

export const RulesPage = () => (
  <div className="space-y-6">
    <h1 className="text-xl font-bold">モルックのルール</h1>

    <section>
      <SectionTitle>最初の配置</SectionTitle>
      <Card className="space-y-2 py-5">
        {[...INITIAL_FORMATION].reverse().map((row, index) => (
          <div key={index} className="flex justify-center gap-2">
            {row.map((pin) => (
              <span
                key={pin}
                className="tabular flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/10 text-sm font-bold text-amber-300"
              >
                {pin}
              </span>
            ))}
          </div>
        ))}
        <p className="pt-2 text-center text-xs text-slate-500">↑ 奥　／　手前 ↓</p>
        <p className="text-center text-xs text-slate-400">ここから 3.5m 離れて投げる</p>
      </Card>
    </section>

    {sections.map((section) => (
      <section key={section.title}>
        <SectionTitle>{section.title}</SectionTitle>
        <Card>
          <ul className="space-y-2 text-sm leading-relaxed">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-400">・</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    ))}
  </div>
)
