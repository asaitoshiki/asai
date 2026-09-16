import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { getOshi } from '../../db/queries'

/** 画面全体をメンバーカラーで塗るペンライト。会場で掲げて使う想定 */
export function PenlightPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const oshi = useLiveQuery(() => getOshi(id!), [id])
  const [chromeVisible, setChromeVisible] = useState(true)

  // 掲げている間に画面が消えないようにする（対応ブラウザのみ）
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | undefined
    navigator.wakeLock.request('screen').then(
      (lock) => {
        sentinel = lock
      },
      () => undefined,
    )
    return () => void sentinel?.release()
  }, [])

  if (!oshi) return null

  return (
    <div
      onClick={() => setChromeVisible((visible) => !visible)}
      style={{ backgroundColor: oshi.color }}
      className="flex min-h-dvh flex-col items-center justify-center"
    >
      {chromeVisible && (
        <div className="flex flex-col items-center gap-6 text-center mix-blend-difference">
          <p className="text-3xl font-bold text-white">{oshi.name}</p>
          <p className="text-xs text-white/80">画面をタップで表示を消す</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              navigate(-1)
            }}
            className="rounded-full border border-white/60 px-5 py-2 text-sm text-white"
          >
            戻る
          </button>
        </div>
      )}
    </div>
  )
}
