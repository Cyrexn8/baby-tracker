import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'
import type { Feeding, FeedingType } from '../../lib/db/schema'
import { feedings, type FeedingInput } from '../../lib/repositories'
import { useSettings } from '../../lib/settings/SettingsProvider'
import { useTodayKey } from '../../lib/hooks/useTodayKey'
import { useNow } from '../../lib/hooks/useNow'
import { formatDurationLong, minutesBetween } from '../../lib/time/duration'
import { isForgottenTimer } from '../../lib/time/timer'
import { summarizeFeedings } from '../../lib/time/summary'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, Section } from '../../components/ui/Card'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { SegmentedControl, type SegmentOption } from '../../components/ui/SegmentedControl'
import { FeedingQuickAdd } from './FeedingQuickAdd'
import { RunningFeedingCard } from './RunningFeedingCard'
import { FeedingList } from './FeedingList'
import { FeedingFormSheet } from './FeedingFormSheet'
import { feedingCountLabel, FEEDING_TYPES, FEEDING_TYPE_TITLES } from './feedingLabels'
import { useDayFeedings, useRunningFeeding } from './hooks'

export interface FeedingSectionProps {
  childId: string
}

const FEEDING_TAB_OPTIONS: readonly SegmentOption<FeedingType>[] = FEEDING_TYPES.map((type) => ({
  value: type,
  label: FEEDING_TYPE_TITLES[type],
}))

/** Что открыто в панели формы: тип всегда, запись и подставленный конец — при изменении. */
interface EditorState {
  type: FeedingType
  feeding?: Feeding
  endPreset?: Date
}

/**
 * Раздел «Кормления» за текущий «день малыша»: вкладки по типу, таймер груди,
 * быстрый ввод и список. Вкладка запоминается в настройках, идущее кормление — в базе,
 * поэтому переживает перезагрузку страницы.
 */
export function FeedingSection({ childId }: FeedingSectionProps) {
  const { settings, set } = useSettings()
  const { today, dayStartHour } = useTodayKey()
  const { feedings: dayFeedings, loading } = useDayFeedings(childId, today, dayStartHour)
  const { feeding: running, loading: runningLoading } = useRunningFeeding(childId)

  // Раз в секунду только пока таймер идёт; иначе минуты не нужны и тратить их не на что.
  const now = useNow(running ? 1000 : 60_000)
  const summary = summarizeFeedings(dayFeedings, now)

  // Вкладка запоминается: следующая запись начнётся с той же.
  // Выбор в этой сессии приоритетнее настроек; null — «ещё не переключали»,
  // тогда показывается сохранённая вкладка. Начальное значение нельзя брать
  // прямо в useState: настройки читаются из базы асинхронно и доедут позже
  // первого рендера — вкладка после перезагрузки не восстановилась бы.
  const [pickedTab, setPickedTab] = useState<FeedingType | null>(null)
  const tab = pickedTab ?? settings?.lastFeedingTab ?? 'bottle'
  const [editor, setEditor] = useState<EditorState | null>(null)
  // Пока идёт сохранение таймера, кнопки панели недоступны: двойное нажатие
  // «Перейти на правую» успело бы создать вторую запись до обновления запроса.
  const [busy, setBusy] = useState(false)

  const handleTabChange = (type: FeedingType) => {
    setPickedTab(type)
    void set('lastFeedingTab', type).catch((error: unknown) => {
      console.error(error)
    })
  }

  const handleFinish = async () => {
    if (busy || !running) return
    setBusy(true)
    try {
      if (isForgottenTimer(running.startAt, now)) {
        // Не сохраняем молча: даём поправить конец в форме изменения.
        setEditor({ type: 'breast', feeding: running, endPreset: now })
        return
      }
      const endAt = new Date()
      await feedings.update(running.id, { endAt })
      toast.success(`Кормление записано: ${formatDurationLong(minutesBetween(running.startAt, endAt))}`)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить кормление. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const handleSwitchSide = async () => {
    if (busy || !running) return
    setBusy(true)
    try {
      if (isForgottenTimer(running.startAt, now)) {
        // Тот же лимит, что у «Завершить»: время явно неверное, сначала поправим его в форме.
        setEditor({ type: 'breast', feeding: running, endPreset: now })
        return
      }
      // Один момент на оба действия: пауза между грудями не должна «съесть» секунды.
      const switchAt = new Date()
      const nextSide = running.side === 'left' ? 'right' : 'left'
      await feedings.update(running.id, { endAt: switchAt })
      const next: FeedingInput = { childId, type: 'breast', startAt: switchAt, side: nextSide }
      await feedings.add(next)
      toast.success(`Перешли на ${nextSide === 'left' ? 'левую' : 'правую'} грудь`)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось переключить грудь. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const openForm = (type: FeedingType) => setEditor({ type })

  return (
    <Section
      title="Кормления"
      action={
        // Число кормлений за день видно, не листая список.
        <Badge tone="feeding">{feedingCountLabel(summary.count)}</Badge>
      }
    >
      <SegmentedControl label="Тип кормления" value={tab} options={FEEDING_TAB_OPTIONS} onChange={handleTabChange} />

      {tab === 'breast' ? (
        runningLoading ? (
          // Пока решаем «идёт ли таймер», кнопки груди не показываем: он мог уже быть запущен.
          <Card>
            <SkeletonList rows={1} />
          </Card>
        ) : running ? (
          <RunningFeedingCard
            feeding={running}
            now={now}
            busy={busy}
            onFinish={() => void handleFinish()}
            onSwitchSide={() => void handleSwitchSide()}
          />
        ) : (
          <FeedingQuickAdd childId={childId} type="breast" onOpenForm={openForm} />
        )
      ) : (
        <FeedingQuickAdd childId={childId} type={tab} onOpenForm={openForm} />
      )}

      {/* Другое время доступно на любой вкладке, даже пока идёт таймер груди. */}
      <Button variant="secondary" className="w-full" onClick={() => setEditor({ type: tab })}>
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        Другое время
      </Button>

      <Card className="p-0">
        <FeedingList
          feedings={dayFeedings}
          loading={loading}
          now={now}
          onEdit={(feeding) => setEditor({ type: feeding.type, feeding })}
        />
      </Card>

      <FeedingFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        childId={childId}
        type={editor?.type ?? tab}
        feeding={editor?.feeding}
        endPreset={editor?.endPreset}
      />
    </Section>
  )
}
