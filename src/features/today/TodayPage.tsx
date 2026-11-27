import { PageHeader } from '../../components/layout/PageHeader'
import { useActiveChild } from '../child/hooks'
import { useTodayKey } from '../../lib/hooks/useTodayKey'
import { formatDayMonth, formatWeekday } from '../../lib/time/format'
import { parseDayKey } from '../../lib/time/day'
import { SleepSection } from '../sleep/SleepSection'
import { FeedingSection } from '../feeding/FeedingSection'
import { DiaperSection } from '../diaper/DiaperSection'
import { DaySummary } from './DaySummary'
import { useDayEntries } from './hooks'

/** Подпись под заголовком: «Пятница, 27 ноября» — по «дню малыша». */
function todayLabel(today: string): string {
  const date = parseDayKey(today)
  return `${formatWeekday(date)}, ${formatDayMonth(date)}`
}

/** Плавная прокрутка к разделу: карточки-итоги ведут к своим разделам. */
function jumpTo(sectionId: string): void {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Экран «Сегодня»: подпись с датой, итоги-карточки и разделы дня.
 * Разделам итоги не передаются: они сами читают свои таблицы,
 * а карточки берут записи одним общим запросом (src/features/today/hooks.ts).
 */
export function TodayPage() {
  const { child, loading } = useActiveChild()
  const { today, dayStartHour } = useTodayKey()
  const entries = useDayEntries(child?.id ?? null, today, dayStartHour)

  return (
    <div>
      <PageHeader title="Сегодня" description={todayLabel(today)} />
      {/* key на обёртке, а не на разделах: при смене ребёнка все разделы пересоздаются
          с чистым состоянием (закрытые формы, сброшенные вкладки). Разделы-соседи
          с одним и тем же key вызывали ошибку React о дублирующихся ключах. */}
      {loading || !child ? (
        <div className="space-y-3" aria-busy="true" aria-label="Загружается">
          <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      ) : (
        <>
          <DaySummary entries={entries} onJump={jumpTo} />
          {/* id нужны карточкам-итогам: они прокручивают к разделам. */}
          <div key={child.id} className="mt-6 space-y-8">
            <div id="today-sleep">
              <SleepSection childId={child.id} />
            </div>
            <div id="today-feedings">
              <FeedingSection childId={child.id} />
            </div>
            <div id="today-diapers">
              <DiaperSection childId={child.id} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
