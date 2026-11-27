import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { Diaper } from '../../lib/db/schema'
import { useTodayKey } from '../../lib/hooks/useTodayKey'
import { summarizeDiapers } from '../../lib/time/summary'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, Section } from '../../components/ui/Card'
import { DiaperQuickAdd } from './DiaperQuickAdd'
import { DiaperList } from './DiaperList'
import { DiaperFormSheet } from './DiaperFormSheet'
import { diaperCountLabel } from './diaperLabels'
import { useDayDiapers } from './hooks'

export interface DiaperSectionProps {
  childId: string
}

/**
 * Раздел «Подгузники» за текущий «день малыша»: быстрое добавление,
 * запись за другое время и список. День пересчитывается сам при переходе границы.
 */
export function DiaperSection({ childId }: DiaperSectionProps) {
  const { today, dayStartHour } = useTodayKey()
  const { diapers: dayDiapers, loading } = useDayDiapers(childId, today, dayStartHour)
  const summary = summarizeDiapers(dayDiapers)

  // 'new' — форма добавления, Diaper — форма изменения конкретной записи.
  const [editor, setEditor] = useState<Diaper | 'new' | null>(null)

  return (
    <Section
      title="Подгузники"
      action={
        // Число за день видно, не листая список.
        <Badge tone="diaper">{diaperCountLabel(summary.count)}</Badge>
      }
    >
      <DiaperQuickAdd childId={childId} />

      {/* Запись задним числом — редкий случай, поэтому отдельная кнопка ниже крупных. */}
      <Button variant="secondary" className="w-full" onClick={() => setEditor('new')}>
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        Другое время
      </Button>

      <Card className="p-0">
        <DiaperList diapers={dayDiapers} loading={loading} onEdit={setEditor} />
      </Card>

      <DiaperFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        childId={childId}
        diaper={editor === 'new' || editor === null ? undefined : editor}
      />
    </Section>
  )
}
