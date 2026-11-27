import { createBrowserRouter, Navigate } from 'react-router'
import { ROUTES } from './nav'
import { AppLayout, ErrorPage } from './layout/AppLayout'
import { OnboardingPage } from '../features/child/OnboardingPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import {
  GrowthPage,
  HistoryPage,
  MilestonesPage,
  RemindersPage,
  TodayPage,
} from './stubs'

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: ROUTES.welcome, element: <OnboardingPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.today, element: <TodayPage /> },
          { path: ROUTES.history, element: <HistoryPage /> },
          { path: ROUTES.growth, element: <GrowthPage /> },
          { path: ROUTES.milestones, element: <MilestonesPage /> },
          { path: ROUTES.reminders, element: <RemindersPage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
        ],
      },
      // Неизвестный адрес ведёт на главную.
      { path: '*', element: <Navigate to={ROUTES.today} replace /> },
    ],
  },
])
