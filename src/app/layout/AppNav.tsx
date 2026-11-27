import { NavLink } from 'react-router'
import { Settings } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_ITEMS, ROUTES, type NavItem } from '../nav'
import { useDueRemindersCount } from '../../lib/reminders/ReminderProvider'
import { Brand } from './AppHeader'

const LINK =
  'relative flex items-center justify-center gap-1.5 rounded-xl font-semibold text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

function NavButton({ item, layout, badge }: { item: NavItem; layout: 'tab' | 'sidebar'; badge?: number }) {
  const Icon = item.icon
  const showBadge = badge !== undefined && badge > 0
  return (
    <NavLink
      to={item.to}
      end={item.to === ROUTES.today}
      className={({ isActive }) =>
        cn(
          LINK,
          layout === 'tab' ? 'h-14 w-full flex-col text-[11px] leading-none' : 'h-11 px-3 text-base',
          isActive && 'bg-primary-soft text-accent hover:text-accent',
        )
      }
    >
      <span className="relative shrink-0">
        <Icon className={cn('shrink-0', layout === 'tab' ? 'h-6 w-6' : 'h-5 w-5')} aria-hidden="true" />
        {/* В нижней панели метка — на углу значка, в боковой — у правого края пункта. */}
        {showBadge && layout === 'tab' && <NavBadge count={badge} className="absolute -top-2 -right-3" />}
      </span>
      <span className="truncate">{item.label}</span>
      {/* Прижата к краю позиционированием, а не отступом: пункт остаётся по центру, как остальные. */}
      {showBadge && layout === 'sidebar' && (
        <NavBadge count={badge} className="absolute top-1/2 right-2.5 -translate-y-1/2" />
      )}
    </NavLink>
  )
}

function NavBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-white',
        className,
      )}
      aria-label={`Наступивших напоминаний: ${count}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Навигация: внизу на телефоне и слева на широком экране. */
export function AppNav() {
  const dueReminders = useDueRemindersCount()
  const settingsLink = ({ isActive }: { isActive: boolean }) =>
    cn(LINK, 'h-11 px-3 text-base', isActive && 'bg-primary-soft text-accent hover:text-accent')

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-2 border-r border-line bg-surface p-4 lg:flex">
        <div className="px-3 py-2">
          <Brand />
        </div>
        <nav aria-label="Основные разделы" className="mt-2 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.to}
              item={item}
              layout="sidebar"
              badge={item.to === ROUTES.reminders ? dueReminders : undefined}
            />
          ))}
        </nav>
        <NavLink to={ROUTES.settings} className={settingsLink}>
          <Settings className="h-5 w-5" aria-hidden="true" />
          Настройки
        </NavLink>
      </aside>

      <nav
        aria-label="Основные разделы"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavButton
                item={item}
                layout="tab"
                badge={item.to === ROUTES.reminders ? dueReminders : undefined}
              />
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
