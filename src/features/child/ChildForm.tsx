import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import type { Child } from '../../lib/db/schema'
import { AVATAR_COLORS, AVATAR_COLOR_LABELS, type AvatarColor } from '../../lib/colors'
import { todayKey } from '../../lib/time/day'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { childFormSchema, type ChildFormValues } from './childFormSchema'

export interface ChildFormProps {
  /** Редактируемый ребёнок. Без него форма создаёт нового. */
  child?: Child
  onSubmit: (values: ChildFormValues) => Promise<void> | void
  submitLabel: string
  cancelLabel?: string
  onCancel?: () => void
}

/** Форма ребёнка: имя, дата рождения, цвет. Значения проверяет childFormSchema. */
export function ChildForm({ child, onSubmit, submitLabel, cancelLabel = 'Отмена', onCancel }: ChildFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      name: child?.name ?? '',
      birthDate: child?.birthDate ?? '',
      avatarColor: child?.avatarColor ?? AVATAR_COLORS[0],
    },
  })

  const selectedColor = watch('avatarColor')

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field label="Имя" error={errors.name?.message}>
        {(control) => (
          <Input {...control} {...register('name')} placeholder="Например, Соня" autoComplete="off" maxLength={80} />
        )}
      </Field>

      <Field label="Дата рождения" error={errors.birthDate?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('birthDate')}
            type="date"
            inputMode="numeric"
            max={todayKey()}
            placeholder="ГГГГ-ММ-ДД"
          />
        )}
      </Field>

      <Field label="Цвет" error={errors.avatarColor?.message}>
        <ColorPicker
          value={selectedColor}
          onChange={(color) => setValue('avatarColor', color, { shouldValidate: true, shouldDirty: true })}
        />
      </Field>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function ColorPicker({ value, onChange }: { value: AvatarColor; onChange: (color: AvatarColor) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATAR_COLORS.map((color) => {
        const selected = color === value
        return (
          <label
            key={color}
            // Зона нажатия 44×44, а видимый кружок меньше: дают -m-1 и внутренний отступ.
            className="relative -m-1 flex h-11 w-11 cursor-pointer items-center justify-center p-1"
          >
            {/* Сам кружок с цветом; рамка показывает выбранный. */}
            <span
              aria-hidden="true"
              style={{ backgroundColor: color }}
              className={cn(
                'pointer-events-none flex h-9 w-9 items-center justify-center rounded-full transition-transform',
                selected && 'scale-110 inset-ring-2 inset-ring-fg',
              )}
            >
              {selected && <Check className="h-5 w-5 text-white" aria-hidden="true" />}
            </span>
            {/* Невидимая радио-кнопка на всю зону нажатия: нажатие попадает сразу в неё. */}
            <input
              type="radio"
              name="child-avatar-color"
              value={color}
              checked={selected}
              onChange={() => onChange(color)}
              aria-label={`Цвет: ${AVATAR_COLOR_LABELS[color]}`}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            {/* Фокусная рамка для клавиатуры. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg"
            />
          </label>
        )
      })}
    </div>
  )
}
