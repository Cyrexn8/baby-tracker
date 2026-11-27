import { createBrowserRouter, Navigate } from 'react-router'
import { ROUTES } from './nav'
import { AppLayout, ErrorPage } from './layout/AppLayout'
import { OnboardingPage } from '../features/child/OnboardingPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TodayPage } from '../features/today/TodayPage'
import { useActiveChild } from '../features/child/hooks'
import { GrowthPage } from '../features/growth/GrowthPage'
import { MilestonesPage } from '../features/milestones/MilestonesPage'
import { RemindersPage } from '../features/reminders/RemindersPage'
import { HistoryPage } from '../features/history/HistoryPage'

/**
 * Страницам «Рост» и «События» нужен активный ребёнок: id — для записей,
 * дата рождения — для возраста на событиях. Пока ребёнка нет, страницы не рисуем.
 */
function GrowthPageRoute() {
  const { child } = useActiveChild()
  return child ? <GrowthPage childId={child.id} /> : null
}

function MilestonesPageRoute() {
  const { child } = useActiveChild()
  return <MilestonesPage childId={child?.id ?? null} birthDate={child?.birthDate ?? null} />
}

export const router = createBrowserRouter(
  [
    {
      errorElement: <ErrorPage />,
      children: [
        { path: ROUTES.welcome, element: <OnboardingPage /> },
        {
          element: <AppLayout />,
          children: [
            { path: ROUTES.today, element: <TodayPage /> },
            { path: ROUTES.history, element: <HistoryPage /> },
            { path: ROUTES.growth, element: <GrowthPageRoute /> },
            { path: ROUTES.milestones, element: <MilestonesPageRoute /> },
            { path: ROUTES.reminders, element: <RemindersPage /> },
            { path: ROUTES.settings, element: <SettingsPage /> },
          ],
        },
        // Неизвестный адрес ведёт на главную.
        { path: '*', element: <Navigate to={ROUTES.today} replace /> },
      ],
    },
  ],
  // Публикация может жить в подпутии (GitHub Pages): base задаётся в vite.config.ts
  // и приходит сюда через BASE_URL. Локально это '/' — поведение не меняется.
  { basename: import.meta.env.BASE_URL },
)
