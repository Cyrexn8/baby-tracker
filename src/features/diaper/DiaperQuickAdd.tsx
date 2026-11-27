import { useState } from 'react'
import { toast } from 'sonner'
import type { DiaperType } from '../../lib/db/schema'
import { diapers } from '../../lib/repositories'
import { undoableCreateToast } from '../../lib/toast'
import { DIAPER_TYPES, DIAPER_TYPE_LABELS, diaperTypeTitle } from './diaperLabels'
import { Button } from '../../components/ui/Button'

export interface DiaperQuickAddProps {
  childId: string
}

/**
 * Три крупные кнопки быстрого добавления: нажатие сразу создаёт запись «сейчас».
 *
 * Пока сохранение идёт, все кнопки недоступны: ночью нажимают одной рукой,
 * и двойное нажатие легко создать двойную запись.
 */
export function DiaperQuickAdd({ childId }: DiaperQuickAddProps) {
  const [saving, setSaving] = useState(false)

  const handleAdd = async (type: DiaperType) => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await diapers.add({ childId, at: new Date(), type })
      undoableCreateToast(`Записано: ${DIAPER_TYPE_LABELS[type]}`, () => diapers.remove(saved.id))
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    // Группу не выделяем: у каждой кнопки понятная своя подпись.
    <div className="grid grid-cols-3 gap-2">
      {DIAPER_TYPES.map((type) => (
        <Button
          key={type}
          variant="soft"
          // xl = 64 px высоты: по кнопкам нажимают одной рукой, часто ночью.
          // Цвета — из раздела подгузников, поэтому перекрываем розовый «soft».
          size="xl"
          className="whitespace-normal bg-cat-diaper-soft px-2 text-sm leading-tight text-cat-diaper"
          disabled={saving}
          onClick={() => void handleAdd(type)}
        >
          {diaperTypeTitle(type)}
        </Button>
      ))}
    </div>
  )
}
