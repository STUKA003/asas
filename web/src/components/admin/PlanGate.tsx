import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { barbershopApi } from '@/lib/api'

type Plan = 'FREE' | 'BASIC' | 'PRO'

const PLAN_ORDER: Record<Plan, number> = { FREE: 0, BASIC: 1, PRO: 2 }

interface Props {
  require: Plan
  children: React.ReactNode
}

export function PlanGate({ require: required, children }: Props) {
  const { t } = useTranslation(['admin', 'common'])
  const { data: barbershop } = useQuery({ queryKey: ['barbershop'], queryFn: barbershopApi.get })
  const current = (barbershop?.subscription?.plan ?? 'FREE') as Plan
  const planLabel = (plan: Plan) => t(`common:plan.${plan}`)

  if (PLAN_ORDER[current] >= PLAN_ORDER[required]) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5">
        <Lock size={24} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">{t('admin:planGate.title')}</h2>
      <p className="text-zinc-500 text-sm mb-6 max-w-sm">
        {t('admin:planGate.descriptionPrefix')} <strong>{planLabel(required)}</strong> {t('admin:planGate.descriptionMiddle')}
        {' '}{t('admin:planGate.currentPlan')} <strong>{planLabel(current)}</strong>.
      </p>
      <Link
        to="/admin/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors"
      >
        {t('admin:planGate.viewPlans')}
      </Link>
    </div>
  )
}
