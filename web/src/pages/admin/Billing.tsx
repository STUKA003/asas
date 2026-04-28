import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { Check, Zap, Crown, Sparkles, CalendarDays, Scissors, Star } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { barbershopApi } from '@/lib/api'
import { cn } from '@/lib/utils'

type Plan = 'FREE' | 'BASIC' | 'PRO'

const PLANS: {
  id: Plan
  label: string
  price: number
  icon: React.ElementType
  color: string
  description: string
  features: string[]
  limits: { barbers: string; bookings: string }
}[] = [
  {
    id: 'FREE',
    label: 'Grátis',
    price: 0,
    icon: Sparkles,
    color: 'zinc',
    description: 'Para começar sem compromisso.',
    limits: { barbers: '1 barbeiro ativo', bookings: '30 agendamentos/mês' },
    features: [
      '1 barbeiro ativo',
      '30 agendamentos por mês',
      'Página pública de reservas',
      'Gestão de clientes',
      'Horários e bloqueios',
    ],
  },
  {
    id: 'BASIC',
    label: 'Básico',
    price: 19,
    icon: Zap,
    color: 'blue',
    description: 'Para barbearias em crescimento.',
    limits: { barbers: 'Até 3 barbeiros', bookings: 'Agendamentos ilimitados' },
    features: [
      'Até 3 barbeiros ativos',
      'Agendamentos ilimitados',
      'Página pública de reservas',
      'Gestão de clientes',
      'Planos de subscrição para clientes',
      'Extras e produtos',
      'Relatórios básicos',
    ],
  },
  {
    id: 'PRO',
    label: 'Pro',
    price: 39,
    icon: Crown,
    color: 'amber',
    description: 'Para operações profissionais.',
    limits: { barbers: 'Barbeiros ilimitados', bookings: 'Agendamentos ilimitados' },
    features: [
      'Barbeiros ilimitados',
      'Agendamentos ilimitados',
      'Página pública personalizada',
      'Gestão de clientes avançada',
      'Planos de subscrição para clientes',
      'Extras e produtos',
      'Estatísticas e relatórios completos',
      'Suporte prioritário',
    ],
  },
]

const COLOR_STYLES: Record<string, {
  badge: string; border: string; button: string; icon: string; check: string; ring: string
}> = {
  zinc:  { badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', button: 'bg-zinc-800 hover:bg-zinc-700 text-white dark:bg-zinc-100 dark:text-zinc-900', icon: 'text-zinc-500', check: 'text-zinc-500', ring: '' },
  blue:  { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-400 dark:border-blue-500', button: 'bg-blue-600 hover:bg-blue-500 text-white', icon: 'text-blue-500', check: 'text-blue-500', ring: 'shadow-blue-100 dark:shadow-blue-900/20' },
  amber: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-400 dark:border-amber-500', button: 'bg-amber-500 hover:bg-amber-400 text-white', icon: 'text-amber-500', check: 'text-amber-500', ring: 'shadow-amber-100 dark:shadow-amber-900/20' },
}

function UsageBar({ used, max, label }: { used: number | null; max: number | null; label: string }) {
  if (used === null) return null
  const pct = max === null ? 0 : Math.min(100, (used / max) * 100)
  const warning = max !== null && pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={cn('font-medium', warning ? 'text-orange-600' : 'text-zinc-600 dark:text-zinc-400')}>
          {max === null ? `${used} utilizados` : `${used} / ${max}`}
        </span>
      </div>
      {max !== null && (
        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={cn('h-1.5 rounded-full transition-all', warning ? 'bg-orange-400' : 'bg-accent-500')}
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function Billing() {
  const { i18n } = useTranslation()
  const dateFnsLocale = getDateFnsLocale(i18n.language)
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const { data: barbershop } = useQuery({ queryKey: ['barbershop'], queryFn: barbershopApi.get })
  const currentPlan: Plan = barbershop?.subscription?.plan ?? 'FREE'
  const sub = barbershop?.subscription

  const checkout = useMutation({
    mutationFn: async (plan: Exclude<Plan, 'FREE'>) => {
      const response = await barbershopApi.createCheckoutSession({ plan })
      if (response?.url) window.location.href = response.url
      return response
    },
  })

  const portal = useMutation({
    mutationFn: async () => {
      const response = await barbershopApi.createPortalSession()
      if (response?.url) window.location.href = response.url
      return response
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbershop'] }),
  })

  const currentPlanData = PLANS.find((p) => p.id === currentPlan)
  const checkoutStatus = searchParams.get('checkout')

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Assinatura</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gere o teu plano e limites da plataforma.</p>
        </div>

        {checkoutStatus === 'success' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Checkout concluído. O plano será sincronizado automaticamente assim que o Stripe confirmar a subscrição.
          </div>
        )}

        {checkoutStatus === 'cancel' && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            O checkout foi cancelado. Nenhuma alteração foi aplicada.
          </div>
        )}

        {/* Current plan summary card */}
        {sub && currentPlanData && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-1">Plano atual</p>
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', COLOR_STYLES[currentPlanData.color].badge)}>
                    <currentPlanData.icon size={18} className={COLOR_STYLES[currentPlanData.color].icon} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{currentPlanData.label}</p>
                    {currentPlanData.price > 0 && (
                      <p className="text-sm text-zinc-500">{currentPlanData.price}€/mês</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3">
                {sub.endsAt && (
                  <div className="flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 text-sm">
                    <CalendarDays size={14} className="text-zinc-400" />
                    <span className="text-zinc-500">Válido até</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {format(new Date(sub.endsAt), "d 'de' MMMM yyyy", { locale: dateFnsLocale })}
                    </span>
                  </div>
                )}
                {sub.hasCustomer && (
                  <button
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {portal.isPending ? 'A abrir portal...' : 'Gerir faturação no Stripe'}
                  </button>
                )}
              </div>
            </div>

            {/* Usage bars */}
            {(sub.limits.monthlyBookings !== null || sub.limits.activeBarbers !== null) && (
              <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 grid sm:grid-cols-2 gap-4">
                <UsageBar
                  label="Agendamentos este mês"
                  used={sub.limits.monthlyBookings}
                  max={sub.limits.maxMonthlyBookings}
                />
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Scissors size={14} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Barbeiros ativos</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {sub.limits.activeBarbers !== null
                        ? sub.limits.maxBarbers !== null
                          ? `${sub.limits.activeBarbers} / ${sub.limits.maxBarbers}`
                          : `${sub.limits.activeBarbers}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-5 pt-2 md:grid-cols-3 md:items-stretch">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan
            const isPro = plan.id === 'PRO'
            const s = COLOR_STYLES[plan.color]
            const Icon = plan.icon

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border-2 bg-white p-6 transition-all duration-300 dark:bg-zinc-900',
                  isPro
                    ? 'border-amber-400 shadow-[0_24px_48px_-20px_rgba(245,158,11,0.28),0_8px_24px_-8px_rgba(245,158,11,0.18)] dark:border-amber-500'
                    : isCurrent
                      ? cn('shadow-lg', s.border)
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm'
                )}
              >
                {/* Subtle PRO background tint */}
                {isPro && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-50/60 to-transparent dark:from-amber-900/10 pointer-events-none" />
                )}

                <div className="relative mb-4 flex min-h-8 items-start justify-between gap-3">
                  {isCurrent ? (
                    <span className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm',
                      isPro
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : s.badge
                    )}>
                      Plano atual
                    </span>
                  ) : <span />}

                  {isPro && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                      <Star size={11} className="shrink-0 fill-white" />
                      Mais recomendado
                    </div>
                  )}
                </div>

                <div className={cn('relative w-10 h-10 rounded-xl flex items-center justify-center mb-4', s.badge)}>
                  <Icon size={20} className={s.icon} />
                </div>

                <h2 className={cn('relative text-lg font-bold', isPro ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900 dark:text-zinc-100')}>{plan.label}</h2>
                <p className="relative text-xs text-zinc-400 mt-0.5 mb-3">{plan.description}</p>

                <div className="relative mb-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">Grátis</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className={cn('text-3xl font-extrabold', isPro ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100')}>
                        {plan.price}€
                      </span>
                      <span className="text-zinc-400 text-sm pb-1">/mês</span>
                    </div>
                  )}
                </div>

                <div className="relative mb-5 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isPro ? 'bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-600')} />
                      {plan.limits.barbers}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isPro ? 'bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-600')} />
                      {plan.limits.bookings}
                    </p>
                  </div>
                </div>

                <ul className="relative space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                      <Check size={14} className={cn('mt-0.5 shrink-0', s.check)} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || checkout.isPending || portal.isPending}
                  onClick={() => {
                    if (plan.id === 'FREE') {
                      portal.mutate()
                      return
                    }
                    checkout.mutate(plan.id)
                  }}
                  className={cn(
                    'relative w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed',
                    isCurrent
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                      : isPro
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white shadow-md shadow-amber-500/25 disabled:opacity-50'
                        : cn(s.button, 'disabled:opacity-50')
                  )}
                >
                  {isCurrent
                    ? 'Plano ativo'
                    : plan.price === 0
                      ? 'Gerir no portal'
                      : checkout.isPending
                        ? 'A abrir checkout...'
                        : 'Fazer upgrade'}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-zinc-400 text-center">
          Os upgrades e a gestão da assinatura são tratados no Stripe. Cancelamentos e mudanças de método de pagamento ficam no portal de faturação.
        </p>
      </div>
    </AdminLayout>
  )
}
