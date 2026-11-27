/**
 * Генерирует 404.html для GitHub Pages.
 *
 * Pages не умеет SPA-fallback: прямой заход по адресу вроде /baby-tracker/history
 * отдаёт 404 вместо приложения. Сгенерированная страница запоминает запрошенный путь
 * в sessionStorage и перебрасывает в корень приложения, а index.html восстанавливает
 * путь без перезагрузки (скрипт bt.spaRedirect в index.html).
 *
 * Локально не нужен: vite preview и собственный сервер умеют отдавать index.html
 * на любой адрес сами. Вызывается из .github/workflows/deploy.yml:
 *
 *   node scripts/generate-404.mjs dist "$BASE_PATH"
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const [dist = 'dist', basePath = '/'] = process.argv.slice(2)
const root = basePath.endsWith('/') ? basePath : `${basePath}/`

await writeFile(
  join(dist, '404.html'),
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Baby Tracker</title>
    <script>
      try {
        sessionStorage.setItem('bt.spaRedirect', location.pathname + location.search + location.hash)
      } catch (error) {
        /* sessionStorage недоступен — восстановить адрес не получится, но приложение открыть можно */
      }
      location.replace(${JSON.stringify(root)})
    </script>
  </head>
  <body></body>
</html>
`,
)
