// Генерирует PNG-иконки приложения из SVG-исходников в public/icons/.
// Запуск: npm run icons (нужен после изменения icon.svg или icon-maskable.svg).
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(projectRoot, 'public', 'icons')

/** [исходный SVG, размер, итоговый PNG] */
const TARGETS = [
  ['icon.svg', 32, 'icon-32.png'],
  ['icon.svg', 192, 'icon-192.png'],
  ['icon.svg', 512, 'icon-512.png'],
  // Android обрезает maskable-значок по форме системы: фон должен быть на всю площадь.
  ['icon-maskable.svg', 512, 'icon-maskable-512.png'],
  // iOS сам скругляет значок и не любит прозрачность — берём вариант со сплошным фоном.
  ['icon-maskable.svg', 180, 'apple-touch-icon.png'],
]

// SVG нарисован в квадрате 512 px при 72 dpi. Плотность подбираем так, чтобы
// растеризация сразу шла в нужном размере, без размытия при уменьшении.
const densityFor = (size) => (72 * size) / 512

for (const [source, size, output] of TARGETS) {
  await sharp(path.join(iconsDir, source), { density: densityFor(size) })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, output))
  console.log(`${output} (${size}x${size}) из ${source}`)
}
