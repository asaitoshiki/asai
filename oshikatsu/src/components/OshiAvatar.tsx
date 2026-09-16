import type { Oshi } from '../db/schema'
import { useObjectUrl } from '../lib/objectUrl'

interface OshiAvatarProps {
  oshi: Oshi
  size?: number
}

/** 画像が無いときは名前の頭文字をテーマカラーで表示する */
export function OshiAvatar({ oshi, size = 44 }: OshiAvatarProps) {
  const url = useObjectUrl(oshi.avatar)

  return (
    <div
      style={{ width: size, height: size, borderColor: oshi.color }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2"
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span
          style={{ color: oshi.color, fontSize: size * 0.4 }}
          className="font-bold leading-none"
        >
          {oshi.name.slice(0, 1) || '推'}
        </span>
      )}
    </div>
  )
}
