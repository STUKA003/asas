import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, Globe, Mail, Scissors } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import { normalizeSlug, slugify } from '@/lib/slug'
import { getInboxLink } from '@/lib/emailLinks'
import adminLogo from '@/assets/branding/barbershop-logo.png'

const schema = z.object({
  barbershopName: z.string().min(2, 'Nome da barbearia obrigatório'),
  slug: z.string().min(2, 'Mínimo 2 caracteres').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  name:     z.string().min(2, 'O teu nome é obrigatório'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

const FEATURES = [
  'Página pública de agendamentos',
  'Painel de gestão completo',
  'Gestão de barbeiros e horários',
  'Clientes e histórico',
  'Começa grátis, sem cartão',
]

export default function Register() {
  const navigate    = useNavigate()
  const [slugManual, setSlugManual] = useState(false)
  const [resendMsg, setResendMsg]   = useState('')
  const [success, setSuccess]       = useState<{ email: string; slug: string } | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { barbershopName: '', slug: '', name: '', email: '', password: '' },
  })

  const slug = watch('slug')

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue('barbershopName', val)
    if (!slugManual) setValue('slug', slugify(val))
  }

  const { mutate, isPending, error: mutationError } = useMutation({
    mutationFn: (data: FormData) => authApi.register(data),
    onSuccess:  (data) => { setResendMsg(''); setSuccess({ email: data.email, slug: data.barbershop.slug }) },
  })

  const resendMutation = useMutation({
    mutationFn: (data: { email: string; slug: string }) => authApi.resendVerificationEmail(data),
    onSuccess:  (data) => setResendMsg(data.message),
  })

  const apiError =
    mutationError && typeof mutationError === 'object' && 'response' in mutationError
      ? (mutationError as { response?: { data?: { error?: string } } }).response?.data?.error
      : null

  useEffect(() => { applyPlatformAccent() }, [])

  return (
    <div className="flex min-h-screen">

      {/* ── Left — dark panel ─────────────────────────── */}
      <div
        className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
        style={{ background: '#0d0d11' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 20% -5%,  rgba(99,102,241,0.16) 0%, transparent 55%),' +
              'radial-gradient(ellipse 45% 35% at 85% 105%, rgba(79,70,229,0.08) 0%, transparent 50%)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img src={adminLogo} alt="Trimio" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white">Trimio Studio</p>
            <p className="text-[11px] text-white/30">Para barbearias profissionais</p>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative">
          <p className="mb-5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Começa hoje
          </p>
          <h1 className="max-w-xs text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
            O teu negócio online em minutos.
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/45">
            Página de agendamentos, painel de gestão, clientes e relatórios — tudo num único sítio.
          </p>

          <ul className="mt-8 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[13px] text-white/60">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600/30">
                  <Check size={10} className="text-primary-300" />
                </div>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-4">
            <p className="text-[12.5px] font-semibold text-white">Plano Grátis incluído</p>
            <p className="mt-1 text-[12px] leading-5 text-white/40">
              Começas com 1 barbeiro e 30 agendamentos por mês sem pagar nada. Upgrades a partir de 19€/mês quando quiseres crescer.
            </p>
          </div>
        </div>

        <p className="relative text-[11px] text-white/15">
          © {new Date().getFullYear()} Trimio · Plataforma de gestão para barbearias
        </p>
      </div>

      {/* ── Right — form panel ────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={adminLogo} alt="Trimio" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-ink">Trimio Studio</span>
        </div>

        <div className="w-full max-w-md">

          {success ? (
            /* ── Success state ──────────────────────── */
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100">
                <Mail size={24} className="text-success-600" />
              </div>
              <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
                Confirma o teu email
              </h2>
              <p className="text-[13.5px] leading-6 text-ink-muted">
                Enviámos um link de confirmação para <strong className="text-ink">{success.email}</strong>. Confirma antes de entrar no painel.
              </p>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4">
                <p className="text-[13px] font-semibold text-ink">Próximos passos</p>
                <ol className="mt-2.5 space-y-1.5 text-[13px] text-ink-muted">
                  <li>1. Abre a tua caixa de entrada.</li>
                  <li>2. Procura o email da Trimio.</li>
                  <li>3. Clica no link de confirmação.</li>
                  <li>4. Entra no painel com as tuas credenciais.</li>
                </ol>
              </div>

              {resendMsg && (
                <div className="rounded-xl border border-success-100 bg-success-50 px-3.5 py-2.5 text-[13px] text-success-700">
                  {resendMsg}
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-1">
                <a href={getInboxLink(success.email)} target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full">
                    Abrir caixa de email <ArrowRight size={15} />
                  </Button>
                </a>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => resendMutation.mutate(success)}
                  loading={resendMutation.isPending}
                >
                  Reenviar email de confirmação
                </Button>
                <div className="flex gap-2.5">
                  <Button variant="ghost" className="flex-1" onClick={() => navigate('/admin/login')}>
                    Ir para login
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => { setResendMsg(''); setSuccess(null) }}>
                    Criar outra conta
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Form ──────────────────────────────── */
            <>
              <div className="mb-8">
                <Scissors size={28} className="mb-4 text-primary-600" />
                <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
                  Cria a tua barbearia
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
                  Começa grátis — sem cartão de crédito.
                </p>
              </div>

              <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                <Input
                  label="Nome da barbearia"
                  placeholder="Barbearia do João"
                  error={errors.barbershopName?.message}
                  {...register('barbershopName')}
                  onChange={handleNameChange}
                />

                <div className="space-y-1.5">
                  <label className="ui-label">Endereço do teu site</label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-100/80 hover:border-neutral-300">
                    <span className="select-none pl-4 pr-1 text-[12.5px] text-ink-muted whitespace-nowrap">trimio.app/</span>
                    <input
                      className="h-12 min-w-0 flex-1 pr-4 bg-transparent text-sm text-ink outline-none placeholder-ink-muted/50"
                      placeholder="minha-barbearia"
                      {...register('slug')}
                      onChange={(e) => { setSlugManual(true); setValue('slug', normalizeSlug(e.target.value)) }}
                    />
                  </div>
                  {errors.slug ? (
                    <p className="text-xs text-danger-600">{errors.slug.message}</p>
                  ) : slug ? (
                    <p className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                      <Globe size={11} /> trimio.app/{slug}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="O teu nome" placeholder="João Silva" error={errors.name?.message} {...register('name')} />
                  <Input label="E-mail" type="email" placeholder="joao@email.com" error={errors.email?.message} {...register('email')} />
                </div>

                <Input label="Password" type="password" placeholder="Mínimo 6 caracteres" error={errors.password?.message} {...register('password')} />

                {apiError && (
                  <div className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
                    {apiError === 'Slug already taken' ? 'Este endereço já está em uso. Escolhe outro.' : apiError}
                  </div>
                )}

                <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
                  Criar barbearia grátis <ArrowRight size={15} />
                </Button>
              </form>

              <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                <p className="text-[12.5px] text-ink-muted">
                  Já tens conta?{' '}
                  <Link to="/admin/login" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                    Entrar
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
