import { useState } from 'react'
import { Pencil, Plus, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, Section } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SegmentedControl, type SegmentOption } from '../../components/ui/SegmentedControl'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Child } from '../../lib/db/schema'
import { childProfiles } from '../../lib/repositories'
import { formatLongDate } from '../../lib/time/format'
import { useSettings } from '../../lib/settings/SettingsProvider'
import type { Theme } from '../../lib/theme'
import { ChildFormSheet } from '../child/ChildFormSheet'
import { useActiveChild, useChildren } from '../child/hooks'

// Без значков: на узком экране «Системная» иначе не помещается в треть переключателя.
const THEME_OPTIONS: readonly SegmentOption<Theme>[] = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Настройки" />
      <ChildrenSection />
      <Section title="Оформление" description="Тема применяется сразу и запоминается на этом устройстве.">
        <Card>
          <ThemePicker />
        </Card>
      </Section>
    </div>
  )
}

function ThemePicker() {
  const { settings, set } = useSettings()
  return (
    <SegmentedControl
      label="Тема оформления"
      value={settings?.theme ?? 'system'}
      options={THEME_OPTIONS}
      onChange={(value) => set('theme', value)}
    />
  )
}

function ChildrenSection() {
  const { children: childList, loading } = useChildren()
  const { setActiveChildId } = useActiveChild()
  const [editor, setEditor] = useState<Child | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Child | null>(null)

  const handleDelete = async (child: Child) => {
    try {
      const remaining = childList.filter((candidate) => candidate.id !== child.id)
      await childProfiles.removeWithContent(child.id)
      if (remaining.length > 0) await setActiveChildId(remaining[0]?.id ?? null)
      toast.success(`Ребёнок «${child.name}» и его записи удалены`)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <Section
      title="Дети"
      description="Записи ведутся отдельно для каждого ребёнка. Вместе с ребёнком удаляются все его записи."
      action={
        <Button variant="soft" size="sm" onClick={() => setEditor('new')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Добавить
        </Button>
      }
    >
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Загружается">
            <div className="h-12 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-surface-muted" />
          </div>
        ) : childList.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Пока ни одного ребёнка"
            description="Добавьте ребёнка, чтобы начать вести дневник."
            action={<Button onClick={() => setEditor('new')}>Добавить ребёнка</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {childList.map((child) => (
              <li key={child.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={child.name} color={child.avatarColor} className="h-11 w-11 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{child.name}</p>
                  {/* Только дата рождения: возраст есть в шапке, а вместе они не помещаются на телефоне. */}
                  <p className="truncate text-xs text-fg-muted">
                    <span className="sr-only">Дата рождения: </span>
                    {formatLongDate(child.birthDate)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Изменить «${child.name}»`}
                  onClick={() => setEditor(child)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                  aria-label={`Удалить «${child.name}»`}
                  onClick={() => setDeleting(child)}
                >
                  <Trash className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ChildFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        child={editor === 'new' || editor === null ? undefined : editor}
        onSaved={(saved) => setActiveChildId(saved.id)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Удалить ребёнка?"
        description={
          deleting
            ? `Записи «${deleting.name}» — сон, кормления, подгузники, рост и события — тоже будут удалены. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        danger
        onConfirm={async () => {
          if (deleting) await handleDelete(deleting)
        }}
      />
    </Section>
  )
}
