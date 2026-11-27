import { useState } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** Красная кнопка подтверждения — для удаления и необратимых действий. */
  danger?: boolean
}

/** Диалог подтверждения: «Удалить ребёнка?» */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  // Состояние сбрасывается при закрытии, каким бы способом оно ни произошло.
  const handleClose = () => {
    setPending(false)
    onClose()
  }

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      handleClose()
    } catch (error) {
      setPending(false)
      throw error
    }
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} disabled={pending}>
            {pending ? 'Выполняется…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">{description}</p>
    </Sheet>
  )
}
