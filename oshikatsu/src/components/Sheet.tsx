import { useEffect, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** 下から せり上がるモーダル。フォームや日別の詳細表示に使う */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  // シートを開いている間は背面をスクロールさせない
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="背景をタップして閉じる"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-black/40"
      />
      <div className="animate-sheet safe-bottom relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full px-3 py-1 text-sm text-muted"
          >
            閉じる
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
