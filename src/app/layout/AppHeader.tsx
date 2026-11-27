import { Link } from 'react-router'
import { Settings } from 'lucide-react'
import { buttonStyles } from '../../components/ui/Button'
import { withBase } from '../../lib/base'
import { cn } from '../../lib/cn'
import { ROUTES } from '../nav'
import { ChildSwitcher } from '../../features/child/ChildSwitcher'

export interface BrandProps {
  /**
   * Классы для названия — чтобы скрыть его там, где мало места.
   * В шапке на телефоне остаётся один значок, в боковой панели название есть всегда.
   */
  nameClassName?: string
}

/** Логотип: значок и название приложения. */
export function Brand({ nameClassName }: BrandProps = {}) {
  return (
    <span className="flex items-center gap-2">
      <img src={withBase('icons/icon.svg')} alt="" className="h-8 w-8 rounded-lg" />
      <span className={cn('text-lg font-bold tracking-tight', nameClassName)}>Baby Tracker</span>
    </span>
  )
}

/** Верхняя панель: логотип, переключатель ребёнка и вход в настройки. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:pl-64">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* Название видно только на планшете: на телефоне его вытесняет переключатель ребёнка,
              а на широком экране оно уже есть в боковой панели. */}
          <span className="shrink-0 lg:hidden">
            <Brand nameClassName="hidden sm:block lg:hidden" />
          </span>
          <ChildSwitcher />
        </div>
        <Link to={ROUTES.settings} aria-label="Настройки" className={buttonStyles({ variant: 'ghost', size: 'icon' })}>
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}
