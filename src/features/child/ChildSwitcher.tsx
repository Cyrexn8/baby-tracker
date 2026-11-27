import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Avatar } from '../../components/ui/Avatar'
import { formatLongDate } from '../../lib/time/format'
import { formatChildAge } from '../../lib/time/age'
import { ROUTES } from '../../app/nav'
import { ChildFormSheet } from './ChildFormSheet'
import { useActiveChild, useChildren } from './hooks'

/** Кнопка в шапке: текущий ребёнок. Открывает список детей, добавление и переход в настройки. */
export function ChildSwitcher() {
  const navigate = useNavigate()
  const { child, loading, setActiveChildId } = useActiveChild()
  const { children: childList } = useChildren()
  const [listOpen, setListOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  if (loading || !child) {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-surface-muted" aria-hidden="true" />
  }

  const selectChild = async (childId: string) => {
    setListOpen(false)
    await setActiveChildId(childId)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={listOpen}
        className="flex min-w-0 items-center gap-2 rounded-full bg-surface py-1.5 pr-2 pl-1.5 inset-ring-1 inset-ring-line transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Avatar name={child.name} color={child.avatarColor} className="h-8 w-8 text-sm" />
        {/* min-w-0 и truncate: на узком экране длинное имя или возраст обрезаются, а не переносятся. */}
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-sm font-bold">{child.name}</span>
          <span className="block truncate text-xs text-fg-muted">{formatChildAge(child.birthDate)}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
      </button>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Кто в дневнике?">
        <ul className="space-y-1">
          {childList.map((candidate) => {
            const selected = candidate.id === child.id
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => selectChild(candidate.id)}
                  aria-pressed={selected}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Avatar name={candidate.name} color={candidate.avatarColor} className="h-10 w-10 text-base" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{candidate.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {formatChildAge(candidate.birthDate)} · {formatLongDate(candidate.birthDate)}
                    </span>
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 grid gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setListOpen(false)
              setFormOpen(true)
            }}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Добавить ребёнка
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setListOpen(false)
              navigate(ROUTES.settings)
            }}
          >
            Настроить
          </Button>
        </div>
      </Sheet>

      <ChildFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => setActiveChildId(saved.id)}
      />
    </>
  )
}
