import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'
import type { Milestone } from '../../lib/db/schema'
import { milestones } from '../../lib/repositories'
import { MilestoneCard } from './MilestoneCard'
import { MilestoneFormSheet } from './MilestoneFormSheet'
import { useMilestones } from './hooks'

export interface MilestonesPageProps {
  childId: string | null
  /** Дата рождения активного ребёнка: для подписи возраста на день события. */
  birthDate: string | null
}

/**
 * Лента событий «впервые», от новых к старым — так её отдаёт useMilestones.
 * Фото при удалении события не трогаем: файл остаётся в базе для резервной копии.
 */
export function MilestonesPage({ childId, birthDate }: MilestonesPageProps) {
  const { milestones: list, loading } = useMilestones(childId)

  // 'new' — форма добавления, Milestone — форма изменения конкретного события.
  const [editor, setEditor] = useState<Milestone | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Milestone | null>(null)

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await milestones.remove(deleting.id)
      toast.success('Событие удалено')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="События"
        description="Лента событий «впервые»"
        actions={
          <Button variant="soft" size="sm" onClick={() => setEditor('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить событие
          </Button>
        }
      />

      {loading ? (
        <Card>
          <SkeletonList rows={2} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Событий ещё нет"
            description="Первая улыбка, первый зуб, первый шаг — записывайте, чтобы не забыть."
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {list.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              birthDate={birthDate}
              onEdit={setEditor}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <MilestoneFormSheet
        open={editor !== null}
        onClose={() => setEditor(null)}
        childId={childId ?? ''}
        milestone={editor === 'new' || editor === null ? undefined : editor}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Удалить событие?"
        description={
          deleting ? `Событие «${deleting.title}» будет удалено из ленты. Действие нельзя отменить.` : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </div>
  )
}
