import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { barberAuthApi } from '@/lib/api'
import { useBarberAuthStore } from '@/store/barberAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AppMark } from '@/components/ui/AppMark'
import { applyAccentColor, applyPlatformAccent } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'

const schema = z.object({
  slug: z.string().min(1, 'Slug da barbearia obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})

type FormData = z.infer<typeof schema>

const HIGHLIGHTS = [
  {
    icon: CalendarDays,
    title: 'Agenda limpa',
    description: 'Abre o dia e vê logo cortes, horários e encaixes pendentes.',
  },
  {
    icon: UserRound,
    title: 'Cliente no contexto',
    description: 'Telefone, plano, serviços e extras no mesmo ponto de decisão.',
  },
  {
    icon: ShieldCheck,
    title: 'Acesso dedicado',
    description: 'Portal separado do admin, focado só na operação do barbeiro.',
  },
]

const MICRO_STATS = [
  { label: 'Check-ins', value: 'Hoje', icon: BadgeCheck },
  { label: 'Agenda viva', value: 'Tempo real', icon: Clock3 },
  { label: 'Operação', value: '1 painel', icon: Sparkles },
]

export default function BarberLogin() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { setAuth } = useBarberAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: slugParam ?? '' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await barberAuthApi.login(data)
      setAuth(res.token, { ...res.barber, barbershopId: res.barber.barbershopId ?? '' })
      if (res.barber?.barbershop?.accentColor) applyAccentColor(res.barber.barbershop.accentColor)
      navigate(`/${data.slug}/barber`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao entrar. Verifica as credenciais.')
    }
  }

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  useInstallBrand('barber')

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.26),transparent_24rem),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.12),transparent_18rem),linear-gradient(180deg,#08080a_0%,#111114_48%,#17171c_100%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-500/10 to-transparent" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-6 lg:grid-cols-[minmax(0,1.15fr)_30rem] lg:px-8 lg:py-8">
          <section className="flex min-h-[34rem] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_90px_-46px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div>
              <div className="max-w-sm">
                <AppMark
                  icon={Scissors}
                  eyebrow="Portal do barbeiro"
                  title="Trimio Flow"
                  subtitle="Login operacional para quem trabalha na cadeira, não no backoffice."
                  tone="barber"
                />
              </div>

              <div className="mt-10 max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200/80">
                  Acesso direto ao ritmo do dia
                </p>
                <h1 className="mt-4 text-4xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                  Agenda, cliente e execução num só fluxo.
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                  O portal do barbeiro foi desenhado para abrir rápido, mostrar o que importa e reduzir
                  mudança de contexto durante o atendimento.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {HIGHLIGHTS.map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/18 text-orange-300">
                      <item.icon size={18} />
                    </div>
                    <h2 className="mt-5 text-sm font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-3 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
              {MICRO_STATS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <item.icon size={14} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.label}</span>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[2rem] border border-white/12 bg-[#111116]/88 p-6 shadow-[0_34px_110px_-52px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-8">
              <div className="mb-8">
                <div className="max-w-xs">
                  <AppMark
                    icon={Scissors}
                    eyebrow="Entrar no Flow"
                    title="Sessão do barbeiro"
                    subtitle="Acesso individual à agenda e atividade diária."
                    tone="barber"
                    compact
                  />
                </div>

                {slugParam ? (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/12 px-3 py-1.5 text-xs font-semibold text-orange-200">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    Barbearia: {slugParam}
                  </div>
                ) : null}

                <h2 className="mt-6 text-3xl font-semibold text-white">Entrar no portal</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Consulta a agenda, gere estados dos agendamentos e mantém o teu turno organizado.
                </p>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {!slugParam ? (
                  <Input
                    label="Barbearia (slug)"
                    placeholder="ex: barbearia-central"
                    error={errors.slug?.message}
                    className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus:border-orange-400 focus:ring-orange-500/10"
                    {...register('slug')}
                  />
                ) : null}

                <Input
                  label="E-mail"
                  type="email"
                  placeholder="joao@example.com"
                  error={errors.email?.message}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus:border-orange-400 focus:ring-orange-500/10"
                  {...register('email')}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus:border-orange-400 focus:ring-orange-500/10"
                  {...register('password')}
                />

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="h-12 w-full rounded-2xl border-orange-500 bg-gradient-to-r from-orange-500 to-amber-400 text-zinc-950 hover:from-orange-400 hover:to-amber-300"
                >
                  Entrar no Flow <ArrowRight size={16} />
                </Button>
              </form>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Inclui</p>
                <div className="mt-3 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Dashboard com receita e carga do dia</div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Agenda com drag & drop e detalhe do cliente</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
