import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import type { Reminder } from '../../lib/db/schema'
import type { ReminderRule } from '../../lib/reminders/rule'
import { WEEKDAY_LABELS_SHORT, WEEKDAYS_MONDAY_FIRST } from '../../lib/reminders/rule'
import { reminders } from '../../lib/repositories'
import { toDateTimeInputValue, parseDateTimeInputValue } from '../../lib/time/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { Field } from '../../components/ui/Field'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { SegmentedControl, type SegmentOption } from '../../components/ui/SegmentedControl'
import { useChildren } from '../child/hooks'
import { reminderFormSchema, type ReminderFormValues } from './reminderFormSchema'

export interface ReminderFormSheetProps {
  open: boolean
  onClose: () => void
  /** Изменяемое напоминание. Без него форма добавляет новое. */
  reminder?: Reminder
}

/** Типы повтора — в порядке переключателя. */
const KIND_OPTIONS: readonly SegmentOption<ReminderFormValues['kind']>[] = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'once', label: 'Разово' },
  { value: 'weekly', label: 'По дням' },
  { value: 'interval', label: 'Интервал' },
]

/** Значения по умолчанию — вне компонента: «сейчас» считается на открытии панели. */
function buildDefaults(reminder: Reminder | undefined): ReminderFormValues {
  const rule: ReminderRule | undefined = reminder?.rule
  return {
    // Новый напоминание чаще всего ежедневное: витамины, упражнения.
    kind: rule?.kind ?? 'daily',
    title: reminder?.title ?? '',
    note: reminder?.note ?? '',
    childId: reminder?.childId ?? '',
    at: rule?.kind === 'once' ? toDateTimeInputValue(rule.at) : '',
    time: rule && (rule.kind === 'daily' || rule.kind === 'weekly') ? rule.time : '',
    weekdays: rule?.kind === 'weekly' ? [...rule.weekdays] : [],
    everyMinutes: rule?.kind === 'interval' ? String(rule.everyMinutes) : '',
    from: rule?.kind === 'interval' ? toDateTimeInputValue(rule.from) : toDateTimeInputValue(new Date()),
    to: rule?.kind === 'interval' && rule.to !== null ? toDateTimeInputValue(rule.to) : '',
    active: reminder?.active ?? true,
  }
}

/**
 * Панель с формой напоминания: название, «для кого», тип повтора и его поля.
 *
 * Сама форма живёт, только пока панель открыта: значения по умолчанию
 * берутся на момент открытия, а не на момент загрузки страницы.
 */
export function ReminderFormSheet({ open, onClose, reminder }: ReminderFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? 'Изменить напоминание' : 'Новое напоминание'}
      description="Что напомнить и по какому расписанию."
    >
      {open && <ReminderForm reminder={reminder} onClose={onClose} />}
    </Sheet>
  )
}

interface ReminderFormProps {
  reminder?: Reminder
  onClose: () => void
}

function ReminderForm({ reminder, onClose }: ReminderFormProps) {
  const { children: childList } = useChildren()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormValues>({
    // Приведение типов: схема — объединение по типу повтора, форма — плоский интерфейс.
    // Проверка остаётся строгой в zod, лишние для ветки поля он отбрасывает сам.
    resolver: zodResolver(reminderFormSchema) as unknown as Resolver<ReminderFormValues>,
    defaultValues: buildDefaults(reminder),
  })

  const kind = watch('kind')
  const weekdays = watch('weekdays')

  const toggleWeekday = (day: number) => {
    const next = weekdays.includes(day) ? weekdays.filter((candidate) => candidate !== day) : [...weekdays, day]
    setValue('weekdays', next, { shouldValidate: true, shouldDirty: true })
  }

  const handleSubmitValues = async (values: ReminderFormValues) => {
    // Дата хранится в базе как Date, объём минут — числом: форма держит строки.
    let rule: ReminderRule
    if (values.kind === 'once') {
      const at = parseDateTimeInputValue(values.at)
      if (!at) {
        toast.error('Укажите дату и время')
        return
      }
      rule = { kind: 'once', at }
    } else if (values.kind === 'daily') {
      rule = { kind: 'daily', time: values.time }
    } else if (values.kind === 'weekly') {
      rule = { kind: 'weekly', weekdays: values.weekdays, time: values.time }
    } else {
      const from = parseDateTimeInputValue(values.from)
      if (!from) {
        toast.error('Укажите дату и время')
        return
      }
      rule = {
        kind: 'interval',
        everyMinutes: Number(values.everyMinutes),
        from,
        to: values.to === '' ? null : parseDateTimeInputValue(values.to),
      }
    }

    const patch = {
      title: values.title,
      note: values.note,
      // Пустой ребёнок — «Для всех»: напоминание не привязано к профилю.
      childId: values.childId === '' ? null : values.childId,
      rule,
      active: values.active,
    }
    try {
      if (reminder) {
        await reminders.update(reminder.id, patch)
        toast.success('Изменения сохранены')
      } else {
        await reminders.add(patch)
        toast.success('Напоминание добавлено')
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
          <Input {...control} {...register('title')} placeholder="Например: упражнения" maxLength={120} />
        )}
      </Field>

      <Field label="Для кого">
        <Select {...register('childId')}>
          <option value="">Для всех</option>
          {childList.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Повтор">
        <SegmentedControl
          label="Повтор"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(next) => setValue('kind', next, { shouldValidate: true, shouldDirty: true })}
        />
      </Field>

      {kind === 'once' && (
        <DateTimeField
          label="Когда"
          error={errors.at?.message}
          registration={register('at')}
        />
      )}

      {kind === 'daily' && (
        <Field label="Время" error={errors.time?.message}>
          {(control) => <Input {...control} {...register('time')} type="time" />}
        </Field>
      )}

      {kind === 'weekly' && (
        <>
          <Field label="Дни недели" error={errors.weekdays?.message}>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS_MONDAY_FIRST.map((day) => {
                const selected = weekdays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Каждый: ${WEEKDAY_LABELS_SHORT[day]}`}
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      'h-11 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      selected ? 'bg-cat-reminder-soft text-cat-reminder' : 'bg-surface-muted text-fg-muted hover:text-fg',
                    )}
                  >
                    {WEEKDAY_LABELS_SHORT[day]}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Время" error={errors.time?.message}>
            {(control) => <Input {...control} {...register('time')} type="time" />}
          </Field>
        </>
      )}

      {kind === 'interval' && (
        <>
          <Field label="Каждые N минут" error={errors.everyMinutes?.message}>
            {(control) => (
              <Input
                {...control}
                {...register('everyMinutes')}
                type="number"
                inputMode="numeric"
                min={1}
                max={720}
                step={5}
                placeholder="Например, 90"
              />
            )}
          </Field>

          <DateTimeField
            label="Начало"
            hint="С какого момента считать интервалы"
            error={errors.from?.message}
            registration={register('from')}
          />

          <DateTimeField
            label="Конец"
            optional
            hint="Оставьте пустым — будет повторяться, пока не выключите"
            error={errors.to?.message}
            registration={register('to')}
          />
        </>
      )}

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: мяч и приседания, 10 минут"
            maxLength={500}
            rows={3}
          />
        )}
      </Field>

      {/* Выключенное напоминание не показывается и не приходит уведомлением. */}
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-primary" {...register('active')} />
        <span className="text-sm font-semibold">Включено</span>
      </label>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : reminder ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
