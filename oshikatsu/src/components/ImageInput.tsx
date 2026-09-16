import { useId, useState, type ReactNode } from 'react'

interface ImageInputProps {
  onPick: (files: File[]) => Promise<void> | void
  children: ReactNode
  multiple?: boolean
  className?: string
}

/**
 * 画像を選ぶボタン。取り込みと縮小に時間がかかるので処理中は押せなくする。
 * capture を付けないことで、カメラ撮影もライブラリ選択も OS 側に任せる。
 */
export function ImageInput({ onPick, children, multiple = false, className }: ImageInputProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length === 0) return
          setBusy(true)
          try {
            await onPick(files)
          } finally {
            setBusy(false)
          }
        }}
      />
      <label htmlFor={inputId} className={className}>
        {busy ? '読み込み中…' : children}
      </label>
    </>
  )
}
