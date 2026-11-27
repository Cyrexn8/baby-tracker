import { toast } from 'sonner'

/**
 * Сообщение после быстрого добавления: запись создана случайно по определению,
 * поэтому «Отменить» удаляет её сразу, без подтверждения.
 * Ошибка отмены — отдельное сообщение, сама запись при этом остаётся в дневнике.
 */
export function undoableCreateToast(message: string, undo: () => Promise<void>): void {
  toast.success(message, {
    action: {
      label: 'Отменить',
      onClick: () => {
        void undo().catch((error: unknown) => {
          console.error(error)
          toast.error('Не удалось отменить запись. Попробуйте ещё раз.')
        })
      },
    },
  })
}
