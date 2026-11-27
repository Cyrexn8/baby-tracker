import { toast } from 'sonner'
import type { Child } from '../../lib/db/schema'
import { childProfiles } from '../../lib/repositories'
import { Sheet } from '../../components/ui/Sheet'
import { ChildForm } from './ChildForm'
import type { ChildFormValues } from './childFormSchema'

export interface ChildFormSheetProps {
  open: boolean
  onClose: () => void
  /** Без `child` создаётся новый ребёнок. */
  child?: Child
  /** Вызывается после успешного сохранения — например, чтобы сделать ребёнка активным. */
  onSaved?: (child: Child) => Promise<void> | void
}

/** Панель с формой ребёнка. Одинаково работает для добавления и изменения. */
export function ChildFormSheet({ open, onClose, child, onSaved }: ChildFormSheetProps) {
  const handleSubmit = async (values: ChildFormValues) => {
    try {
      const saved = child ? await childProfiles.update(child.id, values) : await childProfiles.add(values)
      toast.success(child ? 'Изменения сохранены' : `Ребёнок «${saved.name}» добавлен`)
      onClose()
      await onSaved?.(saved)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <Sheet
      // Ключ сбрасывает форму при переключении между детьми.
      key={child?.id ?? 'new'}
      open={open}
      onClose={onClose}
      title={child ? 'Изменить ребёнка' : 'Новый ребёнок'}
      description="Имя и дата рождения нужны, чтобы считать возраст и итоги дня."
    >
      <ChildForm
        child={child}
        onSubmit={handleSubmit}
        submitLabel={child ? 'Сохранить' : 'Добавить'}
        onCancel={onClose}
      />
    </Sheet>
  )
}
