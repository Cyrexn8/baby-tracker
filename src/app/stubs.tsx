import type { LucideIcon } from 'lucide-react'
import { Bell, House, NotebookText, Sparkles, TrendingUp } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { useDueRemindersCount } from '../lib/reminders/ReminderProvider'

/**
 * Заглушки экранов, которые делаются на этапе 2.
 * Каждая заменяется настоящей страницей в src/features/<раздел>/pages/.
 */
function StubPage({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Icon} title="Этот экран ещё в разработке" description={description} />
      </Card>
    </div>
  )
}

export function TodayPage() {
  return (
    <StubPage
      title="Сегодня"
      icon={House}
      description="Здесь будут итоги дня, лента событий, активные таймеры и кнопки быстрого добавления."
    />
  )
}

export function HistoryPage() {
  return (
    <StubPage
      title="История"
      icon={NotebookText}
      description="Здесь будет история сна, кормлений и подгузников по дням с графиками за неделю."
    />
  )
}

export function GrowthPage() {
  return (
    <StubPage
      title="Рост"
      icon={TrendingUp}
      description="Здесь будет график веса и роста ребёнка и список измерений."
    />
  )
}

export function MilestonesPage() {
  return (
    <StubPage
      title="События"
      icon={Sparkles}
      description="Здесь будет лента событий «впервые»: первая улыбка, первый зуб, первый шаг."
    />
  )
}

export function RemindersPage() {
  const due = useDueRemindersCount()
  return (
    <div>
      <PageHeader title="Напоминания" />
      <Card className="mb-4">
        <p className="text-sm text-fg-muted">
          Наступивших и ждущих отметки: <strong className="text-fg">{due}</strong>
        </p>
      </Card>
      <Card>
        <EmptyState
          icon={Bell}
          title="Этот экран ещё в разработке"
          description="Здесь будет список напоминаний, расписание и кнопки «Сделано» и «Напомнить позже»."
        />
      </Card>
    </div>
  )
}
