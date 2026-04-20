import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { barberAuthApi } from '@/lib/api'
import { useBarberAuthStore } from '@/store/barberAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AppMark } from '@/components/ui/AppMark'
import { ArrowRight, Calendar, Scissors, UserRound } from 'lucide-react'
import { applyAccentColor, applyPlatformAccent } from '@/lib/theme'

const schema = z.object({
  slug:     z.string().min(1, 'Slug da barbearia obrigatório'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})
type FormData = z.infer<typeof schema>

export default function BarberLogin() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const { setAuth } = useBarberAuthStore()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_24rem),linear-gradient(180deg,#09090b_0%,#121417_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
        <section className="hidden rounded-[2rem] border border-white/10 bg-white/[0.04] px-8 py-10 text-white backdrop-blur-xl lg:block">
          <div className="max-w-sm">
            <AppMark
              icon={Scissors}
              eyebrow="Trimio Barber"
              title="Trimio Flow"
              subtitle="Agenda pessoal, clientes e ritmo diário num espaço focado no barbeiro."
              tone="barber"
            />
          </div>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Portal do barbeiro</p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-[0.96]">A tua agenda, os teus clientes, o teu ritmo.</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Calendar, title: 'Agenda diária' },
              { icon: UserRound, title: 'Perfil e clientes' },
              { icon: Scissors, title: 'Fluxo de trabalho' },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <item.icon size={16} className="text-accent-300" />
                </div>
                <p className="mt-4 text-sm font-semibold">{item.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-white/10 bg-zinc-900/88 p-6 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-8">
          <div className="mb-8">
            <div className="max-w-xs">
              <AppMark
                icon={Scissors}
                eyebrow="Acesso barbeiro"
                title="Trimio Flow"
                subtitle="Operação individual do barbeiro."
                tone="barber"
                compact
              />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Acesso exclusivo</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Entrar no portal do barbeiro</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Consulta a agenda, acompanha o dia e trabalha com mais previsibilidade.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!slugParam && (
              <Input
                label="Barbearia (slug)"
                placeholder="ex: barbearia-central"
                error={errors.slug?.message}
                {...register('slug')}
              />
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="joao@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-100" loading={isSubmitting}>
              Entrar <ArrowRight size={16} />
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
