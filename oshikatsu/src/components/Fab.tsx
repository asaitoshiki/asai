import { Icon } from './Icon'

/** 追加ボタン。中央寄せのコンテンツ幅に合わせて右下に固定する */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40">
      <div className="mx-auto flex max-w-lg justify-end px-4">
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg shadow-accent/30"
        >
          <Icon name="plus" className="size-7" />
        </button>
      </div>
    </div>
  )
}
