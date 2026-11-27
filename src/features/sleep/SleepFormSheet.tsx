import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { SleepSession } from '../../lib/db/schema'
import { sleepSessions } from '../../lib/repositories'
import { toDateTimeInputValue, parseDateTimeInputValue } from '../../lib/time/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { Field } from '../../components/ui/Field'
import { Textarea } from '../../components/ui/Input'
import { sleepFormSchema, type SleepFormValues } from './sleepFormSchema'

export interface SleepFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ребёнок, к которому относится запись. */
  childId: string
  /** Изменяемый сон. Без него форма добавляет новый. */
  session?: SleepSession
  /**
   * Конец, подставленный заранее: так панель открытия таймера предлагает
   * поправить забытое время (конец «сейчас» вместо пустого).
   */
  endPreset?: Date
}

/**
 * Панель с формой сна: начало, конец, заметка.
 * Пустой конец означает «спит сейчас» — форма умеет и записывать прошлое,
 * и останавливать таймер за другое время.
 *
 * Сама форма живёт, только пока панель открыта: значения по умолчанию («сейчас»)
 * берутся на момент открытия, а не на момент загрузки страницы.
 */
export function SleepFormSheet({ open, onClose, childId, session, endPreset }: SleepFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={session ? 'Изменить сон' : 'Сон за другое время'}
      description="Укажите, когда ребёнок уснул и проснулся. Пустой конец — сон ещё идёт."
    >
      {open && <SleepForm childId={childId} session={session} endPreset={endPreset} onClose={onClose} />}
    </Sheet>
  )
}

interface SleepFormProps {
  childId: string
  session?: SleepSession
  endPreset?: Date
  onClose: () => void
}

/** Значение «сейчас» для атрибута max: родной календарь не даст выбрать будущее. */
function nowInputValue(): string {
  return toDateTimeInputValue(new Date())
}

/** Значения формы по умолчанию: функция вне компонента — «сейчас» считается на открытии панели. */
function buildDefaults(session: SleepSession | undefined, endPreset: Date | undefined): SleepFormValues {
  // У идущего сна конец пустой, а «endPreset» — предложение панели таймера поправить время.
  const end = session?.endAt ?? endPreset ?? null
  return {
    // Новая запись по умолчанию ставится «сейчас»: чаще всего время угадано верно.
    startAt: toDateTimeInputValue(session?.startAt ?? new Date()),
    endAt: end ? toDateTimeInputValue(end) : '',
    note: session?.note ?? '',
  }
}

function SleepForm({ childId, session, endPreset, onClose }: SleepFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SleepFormValues>({
    resolver: zodResolver(sleepFormSchema),
    defaultValues: buildDefaults(session, endPreset),
  })

  const handleSubmitValues = async (values: SleepFormValues) => {
    // Дата хранится в базе как Date, в форме — строкой datetime-local.
    const startAt = parseDateTimeInputValue(values.startAt)
    if (!startAt) {
      // Схема не пропустит пустую строку, поэтому сюда попадаем только при сбое полей ввода.
      toast.error('Укажите время')
      return
    }
    const endAt = values.endAt === '' ? null : parseDateTimeInputValue(values.endAt)
    try {
      if (session) {
        await sleepSessions.update(session.id, { startAt, endAt, note: values.note })
        toast.success('Изменения сохранены')
      } else {
        await sleepSessions.add({ childId, startAt, endAt, note: values.note })
        toast.success('Запись добавлена')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitValues)} noValidate className="space-y-5">
      <DateTimeField
        label="Начало"
        error={errors.startAt?.message}
        registration={register('startAt')}
        // Родной календарь не даст выбрать будущее; проверка в схеме остаётся на случай вставки значения.
        max={nowInputValue()}
      />

      <DateTimeField
        label="Конец"
        optional
        hint="Оставьте пустым, если сон ещё идёт"
        error={errors.endAt?.message}
        registration={register('endAt')}
        max={nowInputValue()}
      />

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: уснул сам, без укачивания"
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
          {isSubmitting ? 'Сохранение…' : session ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
