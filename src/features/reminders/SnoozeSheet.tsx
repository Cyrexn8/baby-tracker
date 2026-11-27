import { toast } from 'sonner'
import type { Reminder } from '../../lib/db/schema'
import { snoozeReminder, SNOOZE_MINUTES } from '../../lib/reminders/actions'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'

export interface SnoozeSheetProps {
  open: boolean
  onClose: () => void
  /** Напоминание, чьё текущее наступление переносится. */
  reminder: Reminder | null
}

/** «Через 15 минут» / «Через 30 минут» / «Через 60 минут» — склонение у всех одинаковое. */
function snoozeLabel(minutes: number): string {
  return `Через ${minutes} минут`
}

/**
 * Панель «Напомнить позже»: переносит текущее наступление на выбранное время.
 * Само состояние пересчитает ReminderProvider, карточка переедет сама.
 */
export function SnoozeSheet({ open, onClose, reminder }: SnoozeSheetProps) {
  const handleSnooze = async (minutes: number) => {
    if (!reminder) return
    try {
      await snoozeReminder(reminder.id, minutes)
      toast.success(snoozeLabel(minutes))
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не удалось отложить. Попробуйте ещё раз.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Напомнить позже" description="Через сколько напомнить снова.">
      <div className="space-y-2">
        {SNOOZE_MINUTES.map((minutes) => (
          <Button key={minutes} variant="secondary" className="w-full" onClick={() => void handleSnooze(minutes)}>
            {snoozeLabel(minutes)}
          </Button>
        ))}
      </div>
    </Sheet>
  )
}
