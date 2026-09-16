import type { Photo } from '../db/schema'
import { useObjectUrl } from '../lib/objectUrl'
import { cls } from '../lib/cls'

interface PhotoThumbProps {
  photo: Photo
  onClick?: () => void
  className?: string
}

export function PhotoThumb({ photo, onClick, className }: PhotoThumbProps) {
  const url = useObjectUrl(photo.thumb)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cls(
        'relative aspect-square overflow-hidden rounded-xl bg-surface-2',
        className,
      )}
    >
      {url && <img src={url} alt={photo.caption} loading="lazy" className="size-full object-cover" />}
      {photo.favorite && (
        <span className="absolute right-1 top-1 text-xs drop-shadow">⭐</span>
      )}
    </button>
  )
}
