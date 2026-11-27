import { Bell, House, NotebookText, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'

/** Адреса страниц приложения — используйте константы, чтобы не опечататься в строке. */
export const ROUTES = {
  today: '/',
  history: '/history',
  growth: '/growth',
  milestones: '/milestones',
  reminders: '/reminders',
  settings: '/settings',
  welcome: '/welcome',
} as const

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Разделы нижней панели (на телефоне) и боковой (на десктопе). */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.today, label: 'Сегодня', icon: House },
  { to: ROUTES.history, label: 'История', icon: NotebookText },
  { to: ROUTES.growth, label: 'Рост', icon: TrendingUp },
  { to: ROUTES.milestones, label: 'События', icon: Sparkles },
  { to: ROUTES.reminders, label: 'Напоминания', icon: Bell },
]
