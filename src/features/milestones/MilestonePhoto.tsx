import { useEffect, useState } from 'react'
import { files } from '../../lib/repositories'

export interface MilestonePhotoProps {
  /** id записи в таблице `files`. */
  photoId: string
  /** Заголовок события: идёт в alt фотографии. */
  title: string
}

/**
 * Фотография события из базы. URL у Blob одноразовый: создаётся при появлении
 * в ленте и отзывается при уходе — иначе утечка памяти при листании ленты.
 */
export function MilestonePhoto({ photoId, title }: MilestonePhotoProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let created: string | null = null

    files
      .get(photoId)
      .then((file) => {
        if (!file) return
        created = files.toObjectUrl(file)
        // Компонент мог разобраться, пока файл читался: отзываем URL сразу.
        if (revoked) {
          URL.revokeObjectURL(created)
          created = null
          return
        }
        setUrl(created)
      })
      .catch((error: unknown) => {
        // Фото не критично: не грузим ленту сообщением об ошибке, только лог.
        console.error(error)
      })

    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [photoId])

  if (!url) return null
  return <img src={url} alt={`Фото: ${title}`} className="mt-3 max-h-72 w-full rounded-xl object-cover" />
}
