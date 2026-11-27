import { Navigate, Outlet, useRouteError } from 'react-router'
import { RotateCcw } from 'lucide-react'
import { AppHeader } from './AppHeader'
import { AppNav } from './AppNav'
import { Button } from '../../components/ui/Button'
import { withBase } from '../../lib/base'
import { ROUTES } from '../nav'
import { useOnboardingState } from '../../features/child/hooks'

/** Экран, пока читаются настройки и данные. */
export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-live="polite" aria-busy="true">
      <img src={withBase('icons/icon.svg')} alt="" className="h-20 w-20 animate-pulse rounded-3xl" />
      <span className="text-sm text-fg-muted">Baby Tracker загружается…</span>
    </div>
  )
}

export function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      <Button onClick={() => window.location.assign(withBase(ROUTES.today))}>
        <RotateCcw className="h-5 w-5" aria-hidden="true" />
        Перезагрузить
      </Button>
    </div>
  )
}

/** Каркас всех основных страниц: шапка, содержимое, навигация. */
export function AppLayout() {
  const { status } = useOnboardingState()

  if (status === 'loading') return <SplashScreen />
  if (status === 'error') {
    return (
      <ErrorScreen
        title="Не удалось открыть базу данных"
        description="Похоже, в браузере запрещено локальное хранилище. Разрешите его для этого сайта и перезагрузите страницу."
      />
    )
  }
  if (status === 'needed') return <Navigate to={ROUTES.welcome} replace />

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 sm:px-6 lg:pb-10">
        <Outlet />
      </main>
      <AppNav />
    </div>
  )
}

/** Страница на случай непойманной ошибки в интерфейсе. */
export function ErrorPage() {
  const error = useRouteError()
  console.error(error)
  return (
    <ErrorScreen
      title="Что-то пошло не так"
      description="Произошла непредвиденная ошибка. Данные в базе не пострадали — перезагрузите страницу."
    />
  )
}
