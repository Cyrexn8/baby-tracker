import { Suspense, lazy, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonList } from '../../components/ui/SkeletonList'
import type { Measurement } from '../../lib/db/schema'
import { MeasurementList } from './MeasurementList'
import { MeasurementFormSheet } from './MeasurementFormSheet'
import { useMeasurements } from './hooks'

// recharts — самый тяжёлый кусок приложения, и нужен он только на этом экране:
// грузим график отдельным чанком, чтобы не замедлять первый запуск остального.
const GrowthChart = lazy(() => import('./GrowthChart').then((module) => ({ default: module.GrowthChart })))

export interface GrowthPageProps {
  childId: string
}

/**
 * Экран «Рост»: график и список измерений. Данные по возрастанию даты —
 * так их удобно отдать графику, список сам переворачивает порядок.
 */
export function GrowthPage({ childId }: GrowthPageProps) {
  const { measurements, loading } = useMeasurements(childId)

  // 'new' — форма добавления, Measurement — форма изменения конкретной записи.
  const [editor, setEditor] = useState<Measurement | 'new' | null>(null)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Рост"
        description="Вес и рост по измерениям"
        actions={
          <Button variant="soft" size="sm" onClick={() => setEditor('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить измерение
          </Button>
        }
      />

      <Card>
        {loading ? (
          <SkeletonList rows={3} />
        ) : (
          // Пока чанк графика едет по сети, на его месте тот же скелет.
          <Suspense fallback={<SkeletonList rows={3} />}>
            <GrowthChart measurements={measurements} />
          </Suspense>
        )}
      </Card>

      <Card className="p-0">
        <MeasurementList measurements={measurements} loading={loading} onEdit={setEditor} />
      </Card>

      <MeasurementFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        childId={childId}
        measurement={editor === 'new' || editor === null ? undefined : editor}
      />
    </div>
  )
}
