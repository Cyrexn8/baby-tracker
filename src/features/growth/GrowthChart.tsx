import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Ruler } from 'lucide-react'
import type { Measurement } from '../../lib/db/schema'
import { formatDayMonth } from '../../lib/time/format'
import { EmptyState } from '../../components/ui/EmptyState'

export interface GrowthChartProps {
  /** Измерения по возрастанию даты: так их отдаёт useMeasurements. */
  measurements: Measurement[]
}

/**
 * Стиль линий через CSS-переменные темы: SVG-атрибуты recharts не понимают var(),
 * а style — понимает, поэтому цвета меняются вместе с темой сами.
 */
const LINE_WEIGHT_STYLE = { stroke: 'var(--cat-growth-strong)' } as const
const LINE_HEIGHT_STYLE = { stroke: 'var(--fg-muted)' } as const
const TICK_PROPS = { fontSize: 12, style: { fill: 'var(--fg-muted)' } } as const

/** «2 кг» / «60 см» — единицы прямо на осях, чтобы график читался сам по себе. */
function weightTick(value: number): string {
  return `${value} кг`
}
function heightTick(value: number): string {
  return `${value} см`
}

/**
 * График веса и роста. У частей измерений может не быть веса или роста —
 * линия тогда строится по имеющимся точкам (connectNulls).
 */
export function GrowthChart({ measurements }: GrowthChartProps) {
  if (measurements.length < 2) {
    return (
      <EmptyState
        icon={Ruler}
        title="Нужно хотя бы два измерения"
        description="По одной отметке линию не построить. Добавьте ещё измерение — и здесь появится график."
      />
    )
  }

  const points = measurements.map((measurement) => ({
    date: formatDayMonth(measurement.measuredOn),
    weightKg: measurement.weightKg,
    heightCm: measurement.heightCm,
  }))

  return (
    // figure с подписью: скринридер объявляет график целиком, как одну картинку.
    <figure aria-label="График веса и роста по датам" className="m-0">
      {/* Подписи линий рядом с графиком: цвета те же, что у линий. */}
      <div className="mb-2 flex items-center gap-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-4 rounded-full" style={{ backgroundColor: 'var(--cat-growth-strong)' }} />
          вес
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-4 rounded-full" style={{ backgroundColor: 'var(--fg-muted)' }} />
          рост
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {/* Вспомогательная сетка только по горизонтали: линии дат не мешают читать значения. */}
          <XAxis
            dataKey="date"
            tick={TICK_PROPS}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="weight"
            width={48}
            domain={[0, 'auto']}
            tick={TICK_PROPS}
            axisLine={false}
            tickLine={false}
            tickFormatter={weightTick}
          />
          <YAxis
            yAxisId="height"
            orientation="right"
            width={48}
            domain={[0, 'auto']}
            tick={TICK_PROPS}
            axisLine={false}
            tickLine={false}
            tickFormatter={heightTick}
          />
          <Tooltip
            formatter={(value, name) => [
              `${String(value).replace('.', ',')} ${name === 'Вес' ? 'кг' : 'см'}`,
              name,
            ]}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              color: 'var(--fg)',
            }}
            labelStyle={{ color: 'var(--fg-muted)' }}
            itemStyle={{ color: 'var(--fg)' }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weightKg"
            name="Вес"
            style={LINE_WEIGHT_STYLE}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            yAxisId="height"
            type="monotone"
            dataKey="heightCm"
            name="Рост"
            style={LINE_HEIGHT_STYLE}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
