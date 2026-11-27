import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Card } from '../../components/ui/Card'
import { withBase } from '../../lib/base'
import { childProfiles, settingsRepository } from '../../lib/repositories'
import { ROUTES } from '../../app/nav'
import { ChildForm } from './ChildForm'
import type { ChildFormValues } from './childFormSchema'
import { useOnboardingState } from './hooks'

/** Экран первого включения: знакомство и добавление первого ребёнка. */
export function OnboardingPage() {
  const navigate = useNavigate()
  const { status } = useOnboardingState()

  // Ребёнок уже есть (например, данные импортировали) — сразу в дневник.
  if (status === 'ready') return <Navigate to={ROUTES.today} replace />

  const handleSubmit = async (values: ChildFormValues) => {
    try {
      const child = await childProfiles.add(values)
      await settingsRepository.setMany({ activeChildId: child.id, onboardingDone: true })
      toast.success(`Ребёнок «${child.name}» добавлен`)
      navigate(ROUTES.today, { replace: true })
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={withBase('icons/icon.svg')} alt="" className="h-20 w-20 rounded-3xl shadow-lg" />
        <h1 className="text-3xl font-bold tracking-tight">Baby Tracker</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          Дневник малыша: сон, кормления, подгузники, рост, события «впервые» и напоминания.
          Расскажите, о ком вести записи.
        </p>
      </div>
      <Card className="w-full max-w-sm">
        <ChildForm onSubmit={handleSubmit} submitLabel="Начать" />
      </Card>
    </div>
  )
}
