import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Building2, Calendar, Layers3, Sparkles, TrendingUp, Users } from 'lucide-react'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'

const PLAN_COLORS: Record<string, { badge: string; bar: string }> = {
  FREE:  { badge: 'bg-white/[0.06] text-white/40',         bar: 'bg-white/25'     },
  BASIC: { badge: 'bg-blue-500/15  text-blue-300',          bar: 'bg-blue-400'     },
  PRO:   { badge: 'bg-amber-500/15 text-amber-300',         bar: 'bg-amber-400'    },
}
const PLAN_LABELS: Record<string, string> = { FREE: 'Grátis', BASIC: 'Básico', PRO: 'Pro' }

function StatCard({
  label, value, icon: Icon, accent, helper, microcopy,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  accent: string
  helper: string
  microcopy: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-white/40">{label}</p>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="mt-3 text-[2.1rem] font-semibold tracking-[-0.03em] text-white leading-none">
        {value}
      </p>
      <p className="mt-3 text-[12px] text-white/30">{helper}</p>
      <div className="mt-3 h-px bg-white/[0.06]" />
      <p className="mt-3 text-[11.5px] leading-5 text-white/25">{microcopy}</p>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { token } = useSuperAuthStore()

  const { data } = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn:  () => superadminApi.stats(token!),
    enabled:  !!token,
  })

  const totalBarbershops   = data?.totalBarbershops   ?? 0
  const totalBookings      = data?.totalBookings      ?? 0
  const totalCustomers     = data?.totalCustomers     ?? 0
  const bookingsThisMonth  = data?.bookingsThisMonth  ?? 0
  const paidShops   = data?.planCounts
    ?.filter((i: { plan: string }) => i.plan !== 'FREE')
    .reduce((s: number, i: { count: number }) => s + i.count, 0) ?? 0
  const proShops    = data?.planCounts?.find((i: { plan: string }) => i.plan === 'PRO')?.count ?? 0
  const adoptionRate     = totalBarbershops > 0 ? Math.round((paidShops / totalBarbershops) * 100) : 0
  const bookingsPerShop  = totalBarbershops > 0 ? (totalBookings / totalBarbershops).toFixed(1) : '0.0'

  const statCards = [
    {
      label: 'Barbearias ativas',
      value: totalBarbershops,
      icon:  Building2,
      accent: 'bg-blue-500/15 text-blue-300',
      helper: `${paidShops} em plano pago`,
      microcopy: adoptionRate >= 50 ? 'Boa adoção comercial' : 'Margem de upgrade disponível',
    },
    {
      label: 'Agendamentos totais',
      value: totalBookings,
      icon:  Calendar,
      accent: 'bg-emerald-500/15 text-emerald-300',
      helper: `${bookingsThisMonth} este mês`,
      microcopy: 'Pulso operacional da plataforma',
    },
    {
      label: 'Clientes totais',
      value: totalCustomers,
      icon:  Users,
      accent: 'bg-violet-500/15 text-violet-300',
      helper: `${bookingsPerShop} bookings / barbearia`,
      microcopy: 'Base acumulada de utilizadores finais',
    },
    {
      label: 'Adoção de planos',
      value: `${adoptionRate}%`,
      icon:  TrendingUp,
      accent: 'bg-amber-500/15 text-amber-300',
      helper: `${proShops} barbearias em Pro`,
      microcopy: 'Qualidade da monetização',
    },
  ]

  return (
    <SuperAdminLayout>
      <div className="space-y-5">

        {/* ── Hero banner ────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] px-6 py-7 sm:px-8 sm:py-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
            style={{ background: 'rgba(99,102,241,0.08)' }}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
                Platform pulse
              </p>
              <h1 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.75rem]">
                Saúde comercial e operacional da plataforma.
              </h1>
              <p className="mt-3 max-w-lg text-[13.5px] leading-6 text-white/40">
                Crescimento, adoção de planos e ritmo real das barbearias dentro do Trimio.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              {/* Paid adoption insight */}
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/[0.15] bg-emerald-500/[0.08] p-3.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                  <BadgeCheck size={14} className="text-emerald-300" />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-emerald-200">Adoção paga</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-emerald-200/60">
                    {adoptionRate >= 50
                      ? 'Mais de metade já estão em plano pago.'
                      : 'Há espaço para converter barbearias grátis.'}
                  </p>
                </div>
              </div>

              {/* Monthly bookings insight */}
              <div className="flex items-start gap-3 rounded-2xl border border-blue-400/[0.15] bg-blue-500/[0.08] p-3.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                  <Sparkles size={14} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-blue-200">Atividade mensal</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-blue-200/60">
                    {bookingsThisMonth} bookings este mês — retenção e recorrência.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stat cards ─────────────────────────────────── */}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </section>

        {/* ── Bottom row ─────────────────────────────────── */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">

          {/* Plan distribution */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  Monetização
                </p>
                <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-white">
                  Distribuição de planos
                </h2>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">Pagos</p>
                <p className="mt-0.5 text-[16px] font-semibold text-white">{paidShops}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {data?.planCounts?.map((plan: { plan: string; count: number }) => {
                const pct = totalBarbershops > 0 ? (plan.count / totalBarbershops) * 100 : 0
                const colors = PLAN_COLORS[plan.plan] ?? PLAN_COLORS.FREE
                return (
                  <div key={plan.plan} className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${colors.badge}`}>
                          {PLAN_LABELS[plan.plan] ?? plan.plan}
                        </span>
                        <span className="text-[13px] text-white/40">
                          {plan.count} barbearia{plan.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-white/70">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Health check */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Health check
            </p>
            <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-white">
              Leitura rápida do negócio
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/[0.15] bg-emerald-500/[0.08] p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Layers3 size={15} className="text-emerald-300" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-100">Base ativa</p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-emerald-200/55">
                    {totalBarbershops} barbearias e {totalCustomers} clientes já passaram pela plataforma.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-400/[0.15] bg-blue-500/[0.08] p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                  <TrendingUp size={15} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-blue-100">Ritmo operacional</p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-blue-200/55">
                    {bookingsPerShop} bookings por barbearia — atividade média da plataforma.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/[0.15] bg-amber-500/[0.08] p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <Sparkles size={15} className="text-amber-300" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-amber-100">Oportunidade</p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-amber-200/55">
                    {adoptionRate < 50
                      ? 'Converter Free → Basic aumenta valor percebido rapidamente.'
                      : 'O próximo salto está em mover Basic → Pro.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </SuperAdminLayout>
  )
}
