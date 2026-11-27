import { countLabel } from '../../lib/plural'

/** '5,6 кг' — запятая вместо точки, как принято в русском тексте. */
export function formatKg(value: number): string {
  return `${String(value).replace('.', ',')} кг`
}

/** '58 см'. */
export function formatCm(value: number): string {
  return `${String(value).replace('.', ',')} см`
}

/** «1 измерение», «2 измерения», «5 измерений» — для заголовков. */
export function measurementCountLabel(count: number): string {
  return countLabel(count, 'измерение', 'измерения', 'измерений')
}
