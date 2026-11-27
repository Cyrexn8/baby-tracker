import { useMemo, useState } from 'react'
import { Droplets, Milk, Moon, NotebookText } from 'lucide-react'
import type { Diaper, Feeding, SleepSession } from '../../lib/db/schema'
import { addDaysToKey, dayStart, groupByDayKey, parseDayKey, type DayKey } from '../../lib/time/day'
import { formatDayMonth } from '../../lib/time/format'
import { formatDuration } from '../../lib/time/duration'
import { summarizeDiapers, summarizeFeedings, summarizeSleep } from '../../lib/time/summary'
import { useNow } from '../../lib/hooks/useNow'
import { useTodayKey } from '../../lib/hooks/useTodayKey'
import { useActiveChild } from '../child/hooks'
import { useDayDiapers, useDiapersInRange } from '../diaper/hooks'
import { DiaperFormSheet } from '../diaper/DiaperFormSheet'
import { DiaperList } from '../diaper/DiaperList'
import { useDayFeedings, useFeedingsInRange } from '../feeding/hooks'
import { FeedingFormSheet } from '../feeding/FeedingFormSheet'
import { FeedingList } from '../feeding/FeedingList'
import { useDaySleep, useSleepInRange } from '../sleep/hooks'
import { SleepFormSheet } from '../sleep/SleepFormSheet'
import { SleepList } from '../sleep/SleepList'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, Section } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { SkeletonList } from '../../components/ui/SkeletonList'

/**
 * Лента по дням: сводка, три списка записей выбранного дня и таблица недели.
 * Формы и подтверждение удаления — те же компоненты, что в разделах «Сегодня».
 */
export function HistoryPage() {
  const { child } = useActiveChild()
  const childId = child?.id ?? null
  const { today, dayStartHour } = useTodayKey()
  const [day, setDay] = useState<DayKey>(today)

  const { sessions, loading: sleepLoading } = useDaySleep(childId, day, dayStartHour)
  const { feedings, loading: feedingsLoading } = useDayFeedings(childId, day, dayStartHour)
  const { diapers, loading: diapersLoading } = useDayDiapers(childId, day, dayStartHour)
  // Раз в минуту: длительность идущего сна и сводка с ним обновляются сами.
  const now = useNow(60_000)

  const loading = sleepLoading || feedingsLoading || diapersLoading

  const sleepSummary = summarizeSleep(sessions, now)
  const feedingsSummary = summarizeFeedings(feedings, now)
  const diapersSummary = summarizeDiapers(diapers)

  // Редактирование записи дня: каждая форма открывается со своей записью.
  const [sleepEditor, setSleepEditor] = useState<SleepSession | null>(null)
  const [feedingEditor, setFeedingEditor] = useState<Feeding | null>(null)
  const [diaperEditor, setDiaperEditor] = useState<Diaper | null>(null)

  // Неделя от выбранного дня назад: from — начало дня -6, to — начало следующего за выбранным.
  const weekRange = useMemo(
    () => ({
      from: dayStart(addDaysToKey(day, -6), dayStartHour),
      to: dayStart(addDaysToKey(day, 1), dayStartHour),
    }),
    [day, dayStartHour],
  )
  const { sessions: weekSleep } = useSleepInRange(childId, weekRange)
  const { feedings: weekFeedings } = useFeedingsInRange(childId, weekRange)
  const { diapers: weekDiapers } = useDiapersInRange(childId, weekRange)

  // Строки недели от выбранного дня назад: итоги по каждой таблице отдельно.
  const weekRows = useMemo(() => {
    const sleepByDay = groupByDayKey(weekSleep, (session) => session.startAt, dayStartHour)
    const feedingsByDay = groupByDayKey(weekFeedings, (feeding) => feeding.startAt, dayStartHour)
    const diapersByDay = groupByDayKey(weekDiapers, (diaper) => diaper.at, dayStartHour)

    return Array.from({ length: 7 }, (_, index) => {
      const key = addDaysToKey(day, -index)
      return {
        key,
        date: parseDayKey(key),
        sleepMinutes: summarizeSleep(sleepByDay.get(key) ?? [], now).totalMinutes,
        feedings: (feedingsByDay.get(key) ?? []).length,
        diapers: (diapersByDay.get(key) ?? []).length,
      }
    })
  }, [weekSleep, weekFeedings, weekDiapers, day, dayStartHour, now])

  const isToday = day === today
  const isYesterday = day === addDaysToKey(today, -1)
  const emptyDay = !loading && sessions.length === 0 && feedings.length === 0 && diapers.length === 0

  return (
    <div className="space-y-4">
      <PageHeader title="История" />

      {/* Разделам нужен активный ребёнок; пока он читается, записи запросить нельзя. */}
      {childId === null ? (
        <Card>
          <SkeletonList rows={3} />
        </Card>
      ) : (
        <>
          {/* Выбор дня: быстрые кнопки плюс родной календарь на любую дату. */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isYesterday ? 'primary' : 'secondary'}
              className="shrink-0"
              onClick={() => setDay(addDaysToKey(today, -1))}
            >
              Вчера
            </Button>
            <Button
              size="sm"
              variant={isToday ? 'primary' : 'secondary'}
              className="shrink-0"
              onClick={() => setDay(today)}
            >
              Сегодня
            </Button>
            {/* Родной календарь не даст выбрать будущее; ограничение дублирует max. */}
            <Input
              type="date"
              aria-label="Дата"
              value={day}
              max={today}
              onChange={(event) => {
                if (event.target.value !== '') setDay(event.target.value)
              }}
              className="min-w-0 flex-1"
            />
          </div>

          {loading ? (
            <Card>
              <SkeletonList rows={3} />
            </Card>
          ) : emptyDay ? (
            <Card>
              <EmptyState
                icon={NotebookText}
                title="В этот день записей нет"
                description="Выберите другой день — «Вчера», «Сегодня» или календарём."
              />
            </Card>
          ) : (
            <>
              <Card className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-label="Сводка за день">
                <span className="text-fg-muted">
                  Сон <strong className="text-fg">{formatDuration(sleepSummary.totalMinutes)}</strong>
                </span>
                <span className="text-fg-muted">
                  Кормления{' '}
                  <strong className="text-fg">
                    {feedingsSummary.count}
                    {feedingsSummary.totalMl > 0 && ` · ${feedingsSummary.totalMl} мл`}
                  </strong>
                </span>
                <span className="text-fg-muted">
                  Подгузники <strong className="text-fg">{diapersSummary.count}</strong>
                </span>
              </Card>

              {sessions.length > 0 && (
                <Section title="Сон">
                  <Card className="p-0">
                    <SleepList sessions={sessions} loading={sleepLoading} now={now} onEdit={setSleepEditor} />
                  </Card>
                </Section>
              )}

              {feedings.length > 0 && (
                <Section title="Кормления">
                  <Card className="p-0">
                    <FeedingList feedings={feedings} loading={feedingsLoading} now={now} onEdit={setFeedingEditor} />
                  </Card>
                </Section>
              )}

              {diapers.length > 0 && (
                <Section title="Подгузники">
                  <Card className="p-0">
                    <DiaperList diapers={diapers} loading={diapersLoading} onEdit={setDiaperEditor} />
                  </Card>
                </Section>
              )}
            </>
          )}

          <Section title="За 7 дней" description="От выбранного дня назад">
            <Card className="p-0">
              {/* Заголовок таблицы: вместо текста — значки разделов, чтобы колонки были узкими. */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-line px-4 py-2 text-xs text-fg-muted">
                <span>День</span>
                <span className="flex items-center gap-1.5 text-cat-sleep">
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" /> сон
                </span>
                <span className="flex items-center gap-1.5 text-cat-feeding">
                  <Milk className="h-3.5 w-3.5" aria-hidden="true" /> кормл.
                </span>
                <span className="flex items-center gap-1.5 text-cat-diaper">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" /> подг.
                </span>
              </div>
              <ul className="divide-y divide-line">
                {weekRows.map((row) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2 text-sm"
                  >
                    <span className={row.key === day ? 'font-semibold' : undefined}>{formatDayMonth(row.date)}</span>
                    <span className="tabular-nums text-cat-sleep">{formatDuration(row.sleepMinutes)}</span>
                    <span className="tabular-nums">{row.feedings}</span>
                    <span className="tabular-nums">{row.diapers}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          {/* Формы переиспользованы из разделов: добавлять записи из истории нельзя, только править. */}
          <SleepFormSheet
            open={sleepEditor !== null}
            onClose={() => setSleepEditor(null)}
            childId={childId}
            session={sleepEditor ?? undefined}
          />
          <FeedingFormSheet
            open={feedingEditor !== null}
            onClose={() => setFeedingEditor(null)}
            childId={childId}
            type={feedingEditor?.type ?? 'breast'}
            feeding={feedingEditor ?? undefined}
          />
          <DiaperFormSheet
            open={diaperEditor !== null}
            onClose={() => setDiaperEditor(null)}
            childId={childId}
            diaper={diaperEditor ?? undefined}
          />
        </>
      )}
    </div>
  )
}
