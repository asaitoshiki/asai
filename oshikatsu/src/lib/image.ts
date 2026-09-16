// 画像は原本を縮小して保存し、一覧描画用のサムネイルを別に持つ。
// 端末内ストレージなので、原本をそのまま入れると数百枚で容量を圧迫する。

const MAX_SOURCE = 1600
const MAX_THUMB = 400
const QUALITY = 0.85

export interface ProcessedImage {
  blob: Blob
  thumb: Blob
  width: number
  height: number
}

/** 長辺を max に収めたときの寸法。元より大きくはしない */
function fit(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

async function render(bitmap: ImageBitmap, max: number): Promise<Blob> {
  const size = fit(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, size.width, size.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の変換に失敗しました'))),
      'image/webp',
      QUALITY,
    )
  })
}

export async function processImage(file: Blob): Promise<ProcessedImage> {
  // EXIF の回転情報を反映させるため from-image を指定する
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const [blob, thumb] = await Promise.all([render(bitmap, MAX_SOURCE), render(bitmap, MAX_THUMB)])
  const size = fit(bitmap.width, bitmap.height, MAX_SOURCE)
  bitmap.close()
  return { blob, thumb, width: size.width, height: size.height }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}
