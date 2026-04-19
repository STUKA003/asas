import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BadgeCheck, Building2, Calendar, Layers3, Sparkles, TrendingUp, Users } from 'lucide-react'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-zinc-800 text-zinc-300',
  BASIC: 'bg-blue-500/15 text-blue-200',
  PRO: 'bg-amber-500/15 text-amber-200',
}
const PLAN_LABELS: Record<string, string> = { FREE: 'Grátis', BASIC: 'Básico', PRO: 'Pro' }

export default function SuperAdminDashboard() {
  const { token } = useSuperAuthStore()

  const { data } = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: () => superadminApi.stats(token!),
    enabled: !!token,
  })

  const totalBarbershops = data?.totalBarbershops ?? 0
  const totalBookings = data?.totalBookings ?? 0
  const totalCustomers = data?.totalCustomers ?? 0
  const bookingsThisMonth = data?.bookingsThisMonth ?? 0
  const paidShops = data?.planCounts?.filter((item: { plan: string }) => item.plan !== 'FREE').reduce((sum: number, item: { count: number }) => sum + item.count, 0) ?? 0
  const proShops = data?.planCounts?.find((item: { plan: string }) => item.plan === 'PRO')?.count ?? 0
  const adoptionRate = totalBarbershops > 0 ? Math.round((paidShops / totalBarbershops) * 100) : 0
  const bookingsPerShop = totalBarbershops > 0 ? (totalBookings / totalBarbershops).toFixed(1) : '0.0'

  const cards = [
    {
      label: 'Barbearias ativas',
      value: totalBarbershops,
      icon: Building2,
      accent: 'bg-blue-500/15 text-blue-200',
      helper: `${paidShops} em plano pago`,
      microcopy: adoptionRate >= 50 ? 'Boa adoção comercial' : 'Ainda há margem para upgrade',
    },
    {
      label: 'Agendamentos totais',
      value: totalBookings,
      icon: Calendar,
      accent: 'bg-emerald-500/15 text-emerald-200',
      helper: `${bookingsThisMonth} este mês`,
      microcopy: 'Pulso operacional da plataforma',
    },
    {
      label: 'Clientes totais',
      value: totalCustomers,
      icon: Users,
      accent: 'bg-violet-500/15 text-violet-200',
      helper: `${bookingsPerShop} bookings por barbearia`,
      microcopy: 'Base acumulada de utilizadores finais',
    },
    {
      label: 'Adoção de planos',
      value: `${adoptionRate}%`,
      icon: TrendingUp,
      accent: 'bg-amber-500/15 text-amber-200',
      helper: `${proShops} barbearias em Pro`,
      microcopy: 'Qualidade da monetização',
    },
  ]

  return (
    <SuperAdminLayout>
      <div className="space-y-6 lg:space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-6 shadow-[0_30px_60px_-36px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:px-8 sm:py-8">
          <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Platform pulse</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                Uma visão clara da saúde comercial e operacional da plataforma.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Aqui o foco não é só volume. É perceber crescimento, adoção dos planos e o ritmo real das barbearias dentro do Trimio.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-2 text-emerald-200">
                    <BadgeCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">Adoção paga</p>
                    <p className="mt-1 text-sm leading-5 text-emerald-200/80">
                      {adoptionRate >= 50 ? 'Mais de metade das barbearias já estão em plano pago.' : 'Ainda há espaço claro para converter barbearias grátis.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-blue-400/20 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-2 text-blue-200">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-100">Atividade mensal</p>
                    <p className="mt-1 text-sm leading-5 text-blue-200/80">
                      {bookingsThisMonth} bookings este mês ajudam a medir retenção e recorrência da plataforma.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[1.65rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
                </div>
                <div className={`rounded-2xl p-3 ${card.accent}`}>
                  <card.icon size={18} />
                </div>
              </div>
              <div className="mt-4 inline-flex max-w-full items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                <ArrowUpRight size={13} />
                <span className="truncate">{card.helper}</span>
              </div>
              <p className="mt-3 text-sm leading-5 text-zinc-500">{card.microcopy}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Monetização</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Distribuição de planos</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Planos pagos</p>
                <p className="mt-1 text-sm font-semibold text-white">{paidShops}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {data?.planCounts?.map((plan: { plan: string; count: number }) => {
                const width = totalBarbershops > 0 ? (plan.count / totalBarbershops) * 100 : 0
                return (
                  <div key={plan.plan} className="rounded-[1.35rem] border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${PLAN_COLORS[plan.plan] ?? 'bg-zinc-800 text-zinc-300'}`}>
                          {PLAN_LABELS[plan.plan] ?? plan.plan}
                        </div>
                        <p className="text-sm text-zinc-400">{plan.count} barbearia{plan.count !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-sm font-semibold text-white">{Math.round(width)}%</p>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full ${plan.plan === 'FREE' ? 'bg-zinc-400' : plan.plan === 'BASIC' ? 'bg-blue-400' : 'bg-amber-400'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Health check</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Leitura rápida do negócio</h2>

            <div className="mt-6 space-y-3">
              <div className="rounded-[1.35rem] border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-2 text-emerald-200">
                    <Layers3 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">Base ativa</p>
                    <p className="mt-1 text-sm leading-5 text-emerald-200/80">
                      {totalBarbershops} barbearias e {totalCustomers} clientes já passaram pela plataforma.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-blue-400/20 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-2 text-blue-200">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-100">Ritmo operacional</p>
                    <p className="mt-1 text-sm leading-5 text-blue-200/80">
                      {bookingsPerShop} bookings por barbearia dão uma ideia rápida da atividade média.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-2 text-amber-200">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-100">Oportunidade</p>
                    <p className="mt-1 text-sm leading-5 text-amber-200/80">
                      {adoptionRate < 50 ? 'Concentrar conversão de Free para Basic pode aumentar valor percebido rapidamente.' : 'O próximo salto está em empurrar mais barbearias do Basic para Pro.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SuperAdminLayout>
  )
}
