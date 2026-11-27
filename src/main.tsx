import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import { AppProviders } from './app/providers/AppProviders'
import { router } from './app/router'
import { setupValidation } from './lib/validation/setup'
import './index.css'

setupValidation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

// Service worker: офлайн-запуск и заготовка обработчиков уведомлений (src/sw.ts).
// Если вышла новая версия, страница не перезагружается сама — это оборвало бы
// заполнение записи. Показываем сообщение и перезагружаемся только по кнопке.
const updateApp = registerSW({
  immediate: true,
  onNeedRefresh: () => {
    toast.info('Доступна новая версия Baby Tracker', {
      description: 'Обновите приложение, когда закончите текущую запись.',
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: 'Обновить',
        onClick: () => {
          void updateApp()
        },
      },
    })
  },
  onRegisterError: (error) => {
    console.warn('Service worker не зарегистрирован', error)
  },
})
