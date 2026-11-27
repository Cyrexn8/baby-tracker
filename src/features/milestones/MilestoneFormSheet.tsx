import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Milestone } from '../../lib/db/schema'
import { files, milestones } from '../../lib/repositories'
import { todayKey } from '../../lib/time/day'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateField } from '../../components/ui/DateField'
import { Field } from '../../components/ui/Field'
import { Input, Textarea } from '../../components/ui/Input'
import { Select } from '../../components/ui/Input'
import { MILESTONE_CATEGORIES } from './milestoneCategories'
import { compressImage } from './compressImage'
import { milestoneFormSchema, type MilestoneFormValues } from './milestoneFormSchema'

export interface MilestoneFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ребёнок, к которому относится запись. */
  childId: string
  /** Изменяемое событие. Без него форма добавляет новое. */
  milestone?: Milestone
}

/**
 * Панель с формой события: название, дата, категория, заметка и фото.
 *
 * Сама форма живёт, только пока панель открыта: дата «сегодня» по умолчанию
 * берётся на момент открытия, а не на момент загрузки страницы.
 */
export function MilestoneFormSheet({ open, onClose, childId, milestone }: MilestoneFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={milestone ? 'Изменить событие' : 'Новое событие'}
      description="Что случилось впервые и когда — фото можно добавить позже."
    >
      {open && <MilestoneForm childId={childId} milestone={milestone} onClose={onClose} />}
    </Sheet>
  )
}

interface MilestoneFormProps {
  childId: string
  milestone?: Milestone
  onClose: () => void
}

function MilestoneForm({ childId, milestone, onClose }: MilestoneFormProps) {
  // Файл не кладём в react-hook-form: file input не держит значение, храним отдельно.
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: milestone?.title ?? '',
      // Новая запись — на сегодня: событие чаще всего записывают в тот же день.
      date: milestone?.date ?? todayKey(),
      categoryId: milestone?.categoryId ?? 'other',
      note: milestone?.note ?? '',
    },
  })

  const handleSubmitValues = async (values: MilestoneFormValues) => {
    let photoId = milestone?.photoId ?? null
    if (photoFile) {
      try {
        const compressed = await compressImage(photoFile)
        const saved = await files.add(compressed.data, { name: compressed.name, mimeType: compressed.mimeType })
        photoId = saved.id
      } catch (error) {
        console.error(error)
        // Форма остаётся открытой: данные не потеряны, можно выбрать другой файл.
        toast.error(error instanceof Error ? error.message : 'Не удалось обработать фото. Попробуйте другой файл.')
        return
      }
    }

    const patch = {
      title: values.title,
      date: values.date,
      categoryId: values.categoryId,
      note: values.note,
      photoId,
    }
    try {
      if (milestone) {
        await milestones.update(milestone.id, patch)
        toast.success('Изменения сохранены')
      } else {
        await milestones.add({ childId, ...patch })
        toast.success('Событие записано')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitValues)} noValidate className="space-y-5">
      <Field label="Название" error={errors.title?.message}>
        {(control) => (
          <Input {...control} {...register('title')} placeholder="Например: первый шаг" maxLength={120} />
        )}
      </Field>

      <DateField
        label="Дата"
        error={errors.date?.message}
        registration={register('date')}
        // Родной календарь не даст выбрать будущее; проверка в схеме остаётся на случай вставки значения.
        max={todayKey()}
      />

      <Field label="Категория" error={errors.categoryId?.message}>
        <Select {...register('categoryId')}>
          {MILESTONE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Фото" optional hint={milestone?.photoId ? 'Выберите новое, чтобы заменить прежнее' : undefined}>
        {(control) => (
          <Input
            {...control}
            type="file"
            accept="image/*"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          />
        )}
      </Field>

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: сделал три шага до дивана"
            maxLength={500}
            rows={3}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : milestone ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
