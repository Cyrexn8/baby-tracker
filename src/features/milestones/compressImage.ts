/**
 * Сжатие фото перед сохранением в базу.
 *
 * Снимок с камеры телефона — это 3–12 МБ, а фото события смотрят на экране
 * телефона и возят в резервной копии. Большая сторона 1600 px и JPEG 0.85
 * дают файл в десятки раз меньше без заметной потери качества.
 */

const MAX_SIDE = 1600
const JPEG_QUALITY = 0.85

export interface CompressedImage {
  data: ArrayBuffer
  mimeType: string
  name: string
}

/** Читает файл, при необходимости уменьшает и превращает в JPEG. Меньше 1600 px не растягивает. */
export async function compressImage(file: File): Promise<CompressedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (error) {
    console.error(error)
    // cause сохраняет исходную ошибку для отладки: пользователю она не видна.
    throw new Error('Не удалось прочитать фото. Попробуйте другой файл.', { cause: error })
  }

  // Уменьшаем только вниз: маленькое фото остаётся как есть.
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Не удалось обработать фото. Попробуйте другой файл.')
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Не удалось сжать фото. Попробуйте другой файл.')

  const data = await blob.arrayBuffer()
  // В базе теперь JPEG, поэтому расширение имени приводим к нему.
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return { data, mimeType: 'image/jpeg', name: `${baseName}.jpg` }
}
