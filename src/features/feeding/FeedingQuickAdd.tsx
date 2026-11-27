import { useState } from 'react'
import { toast } from 'sonner'
import type { Feeding, FeedingType } from '../../lib/db/schema'
import { feedings } from '../../lib/repositories'
import { undoableCreateToast } from '../../lib/toast'
import { amountLabel } from './feedingLabels'
import { Button } from '../../components/ui/Button'

export interface FeedingQuickAddProps {
  childId: string
  /** Активная вкладка: у каждого типа свои быстрые кнопки. */
  type: FeedingType
  /** Открывает форму ручного ввода с указанным типом. */
  onOpenForm: (type: FeedingType) => void
}

/** Объёмы бутылочки под рукой: нажатие сразу записывает «сейчас» с этим объёмом. */
const BOTTLE_AMOUNTS = [30, 60, 90, 120, 150] as const

/** Классы крупных кнопок в цветах раздела кормлений: перекрывают розовый «soft». */
const QUICK_CLASSES = 'bg-cat-feeding-soft text-cat-feeding'

/**
 * Быстрый ввод кормления для активной вкладки. Пока запись сохраняется,
 * кнопки недоступны: у груди это ещё и защита от второго идущего таймера.
 */
export function FeedingQuickAdd({ childId, type, onOpenForm }: FeedingQuickAddProps) {
  const [saving, setSaving] = useState(false)

  const handleAdd = async (action: () => Promise<Feeding>, successMessage: string) => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await action()
      undoableCreateToast(successMessage, () => feedings.remove(saved.id))
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  const startBreast = (side: 'left' | 'right') =>
    void handleAdd(
      () => feedings.add({ childId, type: 'breast', startAt: new Date(), side }),
      `Кормление началось: ${side === 'left' ? 'левая' : 'правая'} грудь`,
    )

  const addBottle = (amountMl: number) =>
    void handleAdd(
      () => feedings.add({ childId, type: 'bottle', startAt: new Date(), amountMl }),
      `Записано: ${amountLabel(amountMl)}`,
    )

  if (type === 'breast') {
    return (
      // Пока кормление идёт, эти кнопки заменяет панель таймера — второй таймер начать нельзя.
      <div className="grid grid-cols-2 gap-2">
        <Button size="xl" variant="soft" className={QUICK_CLASSES} disabled={saving} onClick={() => startBreast('left')}>
          Левая
        </Button>
        <Button size="xl" variant="soft" className={QUICK_CLASSES} disabled={saving} onClick={() => startBreast('right')}>
          Правая
        </Button>
      </div>
    )
  }

  if (type === 'bottle') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {BOTTLE_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            size="xl"
            variant="soft"
            className={QUICK_CLASSES}
            disabled={saving}
            onClick={() => addBottle(amount)}
          >
            {amountLabel(amount)}
          </Button>
        ))}
        {/* Шестая клетка той же сетки: форма, где объём и время можно вписать любые. */}
        <Button size="xl" variant="secondary" onClick={() => onOpenForm('bottle')}>
          Другой объём
        </Button>
      </div>
    )
  }

  // Прикорм без быстрого шаблона: сразу форма с блюдом и реакцией.
  return (
    <Button size="xl" variant="soft" className={`w-full ${QUICK_CLASSES}`} onClick={() => onOpenForm('solid')}>
      Добавить прикорм
    </Button>
  )
}
