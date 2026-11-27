import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bell, Pencil, Plus, Trash } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Reminder } from '../../lib/db/schema'
import {
  describeRule,
  markReminderDone,
  REMINDER_CHECK_INTERVAL_MS,
  sortForList,
  unsnoozeReminder,
  useReminderStates,
  type ReminderState,
} from './hooks'
import { statusText } from './remindersLabels'
import { requestNotificationPermission, notificationSupport, type NotificationSupport } from '../../lib/notifications/notifications'
import { useLive } from '../../lib/hooks/useLive'
import { useNow } from '../../lib/hooks/useNow'
import { formatTime } from '../../lib/time/format'
import { reminders } from '../../lib/repositories'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, Section } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { ReminderFormSheet } from './ReminderFormSheet'
import { SnoozeSheet } from './SnoozeSheet'

/**
 * Карточка разрешения на уведомления. Пока разрешение не выдано, напоминания
 * видны только на этой странице — оно запрашивается здесь, в момент работы с ними.
 */
function NotificationBanner() {
  const [support, setSupport] = useState<NotificationSupport>(() => notificationSupport())

  if (support === 'granted') return null

  if (support !== 'default') {
    return (
      <Card>
        <p className="text-sm text-fg-muted">
          {support === 'denied'
            ? 'Уведомления выключены в настройках браузера — включить их можно только там. Напоминания по-прежнему видны на этой странице.'
            : 'Этот браузер не показывает уведомления — напоминания видны только на этой странице.'}
        </p>
      </Card>
    )
  }

  return (
    <Card className="flex items-center justify-between gap-3">
      <p className="min-w-0 text-sm text-fg-muted">
        Включите уведомления, чтобы не пропустить напоминание, пока приложение открыто.
      </p>
      <Button
        className="shrink-0"
        onClick={() => void requestNotificationPermission().then(setSupport).catch(() => setSupport('denied'))}
      >
        Включить
      </Button>
    </Card>
  )
}

/**
 * Лента напоминаний: ждущие отметки, отложенные и общий список.
 * Состояния считает ReminderProvider — страница только рисует и вызывает действия.
 */
export function RemindersPage() {
  const { states, ready } = useReminderStates()
  // Время нужно только для текстовых описаний правил: обновлять раз в полминуты достаточно.
  const now = useNow(REMINDER_CHECK_INTERVAL_MS)
  // Полный список нужен отдельно: состояния есть только у включённых напоминаний.
  const { data: allRows, loading: listLoading } = useLive(() => reminders.list(), [])

  const sorted = sortForList(states)
  const urgent = sorted.filter((state) => state.status === 'due' || state.status === 'overdue')
  const snoozedStates = sorted.filter((state) => state.status === 'snoozed')

  // 'new' — форма добавления, Reminder — форма изменения конкретного напоминания.
  const [editor, setEditor] = useState<Reminder | 'new' | null>(null)
  const [snoozing, setSnoozing] = useState<Reminder | null>(null)
  const [deleting, setDeleting] = useState<Reminder | null>(null)

  const rows = useMemo(() => {
    const stateById = new Map(states.map((state) => [state.reminder.id, state]))
    return (allRows ?? []).map((row) => ({ row, state: stateById.get(row.id) ?? null }))
  }, [states, allRows])

  const handleDone = async (state: ReminderState) => {
    if (!state.pendingDueAt) return
    try {
      await markReminderDone(state.reminder.id, state.pendingDueAt)
      toast.success('Сделано')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось отметить. Попробуйте ещё раз.')
    }
  }

  const handleUnsnooze = async (state: ReminderState) => {
    try {
      await unsnoozeReminder(state.reminder.id)
      toast.success('Возвращено в ждущие')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось вернуть. Попробуйте ещё раз.')
    }
  }

  const handleToggle = async (row: Reminder, active: boolean) => {
    try {
      await reminders.update(row.id, { active })
    } catch (error) {
      console.error(error)
      toast.error('Не удалось изменить. Попробуйте ещё раз.')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await reminders.remove(deleting.id)
      toast.success('Напоминание удалено')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  const loading = !ready || listLoading

  return (
    <div className="space-y-4">
      <PageHeader
        title="Напоминания"
        actions={
          <Button variant="soft" size="sm" onClick={() => setEditor('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить
          </Button>
        }
      />

      <NotificationBanner />

      {loading ? (
        <Card>
          <SkeletonList rows={3} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="Напоминаний ещё нет"
            description="Например: упражнения каждый день в 10:00 или витамины после обеда — добавьте первое."
          />
        </Card>
      ) : (
        <>
          {urgent.length > 0 && (
            <Section title="Сегодня" action={<Badge tone="reminder">{urgent.length}</Badge>}>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {urgent.map((state) => (
                    <li key={state.reminder.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{state.reminder.title}</p>
                        <p className="truncate text-xs text-fg-muted">{describeRule(state.reminder.rule, now)}</p>
                        {/* Просроченное видно издалека: красная метка со временем планирования. */}
                        {state.status === 'overdue' && state.pendingDueAt && (
                          <p className="text-xs font-medium text-danger">
                            Планировалось {formatTime(state.pendingDueAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => void handleDone(state)}>
                          Сделано
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSnoozing(state.reminder)}>
                          Напомнить позже
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          {snoozedStates.length > 0 && (
            <Section title="Отложенные">
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {snoozedStates.map((state) => (
                    <li key={state.reminder.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{state.reminder.title}</p>
                        <p className="text-xs font-medium text-cat-reminder">
                          Позже · {state.reminder.snoozedUntil ? formatTime(state.reminder.snoozedUntil) : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => void handleDone(state)}>
                          Сделано
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void handleUnsnooze(state)}>
                          Вернуть сейчас
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          <Section title="Все напоминания">
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {rows.map(({ row, state }) => (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    {/* Выключенное остаётся в списке: его можно включить, не создавая заново. */}
                    <label className="flex min-h-11 shrink-0 cursor-pointer items-center px-1">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-primary"
                        checked={row.active}
                        onChange={(event) => void handleToggle(row, event.target.checked)}
                        aria-label={`Включено: ${row.title}`}
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-semibold', !row.active && 'text-fg-muted')}>{row.title}</p>
                      <p className="truncate text-xs text-fg-muted">{describeRule(row.rule, now)}</p>
                      <p className="truncate text-xs text-fg-muted">{state ? statusText(state) : 'Выключено'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Изменить «${row.title}»`}
                      onClick={() => setEditor(row)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                      aria-label={`Удалить «${row.title}»`}
                      onClick={() => setDeleting(row)}
                    >
                      <Trash className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        </>
      )}

      <ReminderFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        reminder={editor === 'new' || editor === null ? undefined : editor}
      />

      <SnoozeSheet open={snoozing !== null} onClose={() => setSnoozing(null)} reminder={snoozing} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Удалить напоминание?"
        description={
          deleting ? `«${deleting.title}» больше не будет приходить. Действие нельзя отменить.` : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </div>
  )
}
