import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  backupFileName,
  buildBackup,
  downloadTextFile,
  importBackup,
  parseBackup,
  readBackupFile,
  type ParsedBackup,
} from '../../lib/backup/backup'
import { formatLongDate } from '../../lib/time/format'
import { plural } from '../../lib/plural'
import { Button } from '../../components/ui/Button'
import { Card, Section } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

/** Что ждёт подтверждения: текст копии и её разбор — дата и число записей. */
interface PendingImport {
  text: string
  parsed: ParsedBackup
}

/**
 * Резервная копия: скачать всё или залить сохранённое. Данные живут только
 * в этом браузере, поэтому копия — единственный способ переехать на другое
 * устройство. Импорт объединяет записи по времени изменения и ничего не удаляет.
 */
export function BackupSection() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pending, setPending] = useState<PendingImport | null>(null)
  // Поле выбора файла держим скрытым: кнопка запускает его, стиль остаётся у Button.
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const text = await buildBackup()
      downloadTextFile(text, backupFileName())
      toast.success('Копия скачана')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось собрать копию. Попробуйте ещё раз.')
    } finally {
      setExporting(false)
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await readBackupFile(file)
      setPending({ text, parsed: parseBackup(text) })
    } catch (error) {
      console.error(error)
      // BackupError несёт уже понятный пользователю текст — показываем как есть.
      toast.error(error instanceof Error ? error.message : 'Не удалось прочитать файл копии.')
    } finally {
      // Сброс поля: выбор того же файла второй раз должен сработать.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!pending || importing) return
    setImporting(true)
    try {
      const summary = await importBackup(pending.text)
      toast.success(`Добавлено ${summary.added} · Обновлено ${summary.updated}`)
      setPending(null)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Не удалось импортировать копию.')
    } finally {
      setImporting(false)
    }
  }

  const totalRecords = pending
    ? Object.values(pending.parsed.counts).reduce((sum, count) => sum + count, 0)
    : 0

  return (
    <Section
      title="Резервная копия"
      description="Копия нужна для переноса на другое устройство: данные хранятся только в этом браузере."
    >
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleExport()} disabled={exporting}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {exporting ? 'Готовим копию…' : 'Скачать копию'}
          </Button>
          <Button
            variant="secondary"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Загрузить копию
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            // Скрытое поле: выбор файла запускает кнопка, поэтому поле не в потоке разметки.
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>
        <p className="text-xs text-fg-muted">
          Импорт не стирает текущие записи: они объединяются с копией по времени изменения.
        </p>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleImport}
        title="Загрузить копию?"
        description={
          pending
            ? `Копия от ${
                pending.parsed.exportedAt ? formatLongDate(pending.parsed.exportedAt) : 'неизвестной даты'
              }: ${totalRecords} ${plural(totalRecords, 'запись', 'записи', 'записей')}. Ничего не удаляется.`
            : ''
        }
        confirmLabel="Загрузить"
      />
    </Section>
  )
}
