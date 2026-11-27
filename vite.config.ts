import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Адрес публикации задаётся одной переменной BASE_PATH: локально и на своём сервере
// приложение живёт в корне ('/'), на GitHub Pages — в подпутии ('/baby-tracker',
// переменную ставит workflow деплоя .github/workflows/deploy.yml). Из этого значения
// собираются base, манифест PWA ниже и basename роутера (src/app/router.tsx).
const basePath = normalizeBase(process.env.BASE_PATH ?? '/')

function normalizeBase(path: string): string {
  if (!path.startsWith('/')) {
    // Git Bash на Windows молча превращает значение вида '/baby-tracker' в путь 'D:/…',
    // так что без проверки сборка вышла бы с испорченными адресами.
    throw new Error(
      `BASE_PATH должен быть адресом от корня сайта (начинаться с '/'), получено: ${path}. ` +
        'В Git Bash на Windows запускайте сборку с MSYS_NO_PATHCONV=1.',
    )
  }
  return path.endsWith('/') ? path : `${path}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Свой service worker (src/sw.ts): кроме кэша в нём есть обработчики push и клика по уведомлению.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Новую версию не применяем молча: перезагрузка посреди заполнения записи
      // сбросила бы введённое. Пользователю показываем предложение обновиться (src/main.tsx).
      registerType: 'prompt',
      // Регистрируем вручную в src/main.tsx.
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: basePath,
        name: 'Baby Tracker',
        short_name: 'Baby Tracker',
        description: 'Дневник малыша: сон, кормления, подгузники, рост, события и напоминания',
        lang: 'ru',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#fbf6f1',
        theme_color: '#d95d6e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
