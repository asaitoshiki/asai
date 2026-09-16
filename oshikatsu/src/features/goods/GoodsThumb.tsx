import { useLiveQuery } from 'dexie-react-hooks'
import { getPhoto } from '../../db/queries'
import { useObjectUrl } from '../../lib/objectUrl'
import type { ID } from '../../db/schema'

/** グッズカードの画像。写真が未設定なら絵文字のプレースホルダーを出す */
export function GoodsThumb({ photoId }: { photoId?: ID }) {
  const photo = useLiveQuery(() => (photoId ? getPhoto(photoId) : undefined), [photoId])
  const url = useObjectUrl(photo?.thumb)

  return (
    <div className="flex aspect-square items-center justify-center bg-surface-2">
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="text-3xl opacity-40">🛍️</span>
      )}
    </div>
  )
}
