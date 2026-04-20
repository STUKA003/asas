import { useEffect } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useInstallBrand } from '@/lib/installBrand'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AppMark } from '@/components/ui/AppMark'
import { ArrowRight, Building2, Clock3, ShieldCheck, Sparkles } from 'lucide-react'
import { applyPlatformAccent } from '@/lib/theme'
import { getInboxLink } from '@/lib/emailLinks'

const schema = z.object({
  slug:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [submitError, setSubmitError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const { register, handleSubmit, formState: { errors }, setError, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => authApi.login(data),
    onSuccess: (data) => {
      setSubmitError('')
      setUnverifiedEmail('')
      setAuth(data.token, data.user)
      navigate('/admin')
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
          : 'Credenciais inválidas'

      setError('password', { message: 'Credenciais inválidas' })
      setUnverifiedEmail('')
      setSubmitError(
        message === 'Invalid credentials'
          ? 'Slug, e-mail ou password inválidos. Se esta barbearia existia só no teu localhost, ainda não está criada na base de dados da VPS.'
          : message === 'Email not verified'
            ? 'Confirma o teu email antes de entrar. Se não recebeste o email, usa o link de reenvio abaixo.'
            : message
      )
      if (message === 'Email not verified') {
        setUnverifiedEmail(getValues('email'))
      }
    },
  })

  useEffect(() => {
    applyPlatformAccent()
  }, [])
  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_28rem] lg:items-center">
        <section className="hidden rounded-[2rem] bg-zinc-950 px-8 py-10 text-white shadow-[0_30px_80px_-40px_rgba(9,9,11,0.6)] lg:block lg:px-12">
          <div className="max-w-sm">
            <AppMark
              icon={Building2}
              eyebrow="Trimio Admin"
              title="Trimio Studio"
              subtitle="Operação, equipa, agenda e faturação no mesmo centro de comando."
              tone="admin"
            />
          </div>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Trimio Admin</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.96]">Gere a tua operação com mais controlo e melhor presença.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
            O painel foi pensado para gerir agenda, clientes, equipa e faturação com uma leitura mais rápida e mais profissional.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Clock3, title: 'Agenda viva', text: 'Vê disponibilidade e ritmo diário.' },
              { icon: ShieldCheck, title: 'Gestão segura', text: 'Acesso centralizado da barbearia.' },
              { icon: Sparkles, title: 'Marca própria', text: 'Experiência mais premium para clientes.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <item.icon size={16} className="text-accent-300" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-6 sm:p-8">
          <div className="mb-8">
            <div className="max-w-xs">
              <AppMark
                icon={Building2}
                eyebrow="Acesso admin"
                title="Trimio Studio"
                subtitle="Gestão central da operação."
                tone="admin"
                compact
              />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Acesso admin</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-950">Entrar no painel da tua barbearia</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Faz login para gerir operação, equipa, clientes e agenda num único sítio.</p>
          </div>

          <form onSubmit={handleSubmit((d) => { setSubmitError(''); mutate(d) })} className="space-y-4">
            <Input
              label="Slug da barbearia"
              placeholder="minha-barbearia"
              error={errors.slug?.message}
              {...register('slug')}
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="admin@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {submitError}
              </div>
            )}
            {unverifiedEmail && (
              <a href={getInboxLink(unverifiedEmail)} target="_blank" rel="noreferrer" className="block">
                <Button type="button" variant="outline" className="w-full">
                  Abrir caixa de email
                </Button>
              </a>
            )}
            <Button type="submit" loading={isPending} className="mt-2 w-full">
              Entrar no painel <ArrowRight size={16} />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Ainda não tens conta?{' '}
            <Link to="/register" className="font-semibold text-accent-600 hover:underline">
              Criar barbearia grátis
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Esqueceste-te da password?{' '}
            <Link to="/admin/forgot-password" className="font-semibold text-accent-600 hover:underline">
              Recuperar acesso
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Não recebeste o email de confirmação?{' '}
            <Link to="/admin/resend-verification" className="font-semibold text-accent-600 hover:underline">
              Reenviar email
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
