import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useInstallBrand } from '@/lib/installBrand'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ArrowRight, Building2, Calendar, BarChart2, Users } from 'lucide-react'
import { applyPlatformAccent } from '@/lib/theme'
import { getInboxLink } from '@/lib/emailLinks'
import adminLogo from '@/assets/branding/barbershop-logo.png'

const schema = z.object({
  slug:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [submitError, setSubmitError]     = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const { t } = useTranslation('admin')

  const FEATURES = [
    { icon: Calendar, label: t('login.panel.feature1Label'), desc: t('login.panel.feature1Desc') },
    { icon: Users,    label: t('login.panel.feature2Label'), desc: t('login.panel.feature2Desc') },
    { icon: BarChart2, label: t('login.panel.feature3Label'), desc: t('login.panel.feature3Desc') },
  ]

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
        typeof error === 'object' && error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
          : 'Credenciais inválidas'

      setError('password', { message: 'Credenciais inválidas' })
      setUnverifiedEmail('')
      setSubmitError(
        message === 'Invalid credentials'
          ? t('login.form.errors.invalidCredentials')
          : message === 'Email not verified'
            ? t('login.form.errors.emailNotVerified')
            : message
      )
      if (message === 'Email not verified') setUnverifiedEmail(getValues('email'))
    },
  })

  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('admin')

  return (
    <div className="flex min-h-screen">

      {/* ── Left — brand panel ───────────────────────────────── */}
      <div
        className="relative hidden w-[52%] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
        style={{ background: '#0d0d11' }}
      >
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 20% -10%, rgba(99,102,241,0.18) 0%, transparent 60%),' +
              'radial-gradient(ellipse 50% 40% at 85% 110%, rgba(79,70,229,0.10) 0%, transparent 55%)',
          }}
        />

        {/* Top — logo + wordmark */}
        <div className="relative flex items-center gap-3">
          <img src={adminLogo} alt="Trimio Studio" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white">{t('login.brand.name')}</p>
            <p className="text-[11px] text-white/35">{t('login.brand.subtitle')}</p>
          </div>
        </div>

        {/* Middle — headline + features */}
        <div className="relative">
          <p className="mb-5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/30">
            {t('login.panel.eyebrow')}
          </p>
          <h1 className="max-w-xs text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
            {t('login.panel.title')}
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/50">
            {t('login.panel.desc')}
          </p>

          <div className="mt-10 space-y-3">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600/25">
                  <f.icon size={15} className="text-primary-300" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{f.label}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/40">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — tagline */}
        <p className="relative text-[11px] text-white/20">
          © {new Date().getFullYear()} Trimio · Plataforma de gestão para barbearias
        </p>
      </div>

      {/* ── Right — form panel ───────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={adminLogo} alt="Trimio Studio" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-ink">Trimio Studio</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <Building2 size={28} className="mb-4 text-primary-600" />
            <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
              {t('login.form.title')}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
              {t('login.form.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit((d) => { setSubmitError(''); mutate(d) })}
            className="space-y-4"
          >
            <Input
              label={t('login.form.slugLabel')}
              placeholder={t('login.form.slugPlaceholder')}
              autoComplete="organization"
              error={errors.slug?.message}
              {...register('slug')}
            />
            <Input
              label={t('login.form.emailLabel')}
              type="email"
              placeholder={t('login.form.emailPlaceholder')}
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-1">
              <Input
                label={t('login.form.passwordLabel')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end">
                <Link
                  to="/admin/forgot-password"
                  className="text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  {t('login.form.forgotPassword')}
                </Link>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
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

            <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
              {t('login.form.submitButton')}
              <ArrowRight size={15} />
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-8 space-y-2.5 border-t border-neutral-100 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-center text-[12.5px] text-ink-muted">
                {t('login.form.noAccount')}{' '}
                <Link to="/register" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                  {t('login.form.createFree')}
                </Link>
              </p>
              <LanguageSelector compact />
            </div>
            <p className="text-center text-[12.5px] text-ink-muted">
              {t('login.form.noVerification')}{' '}
              <Link to="/admin/resend-verification" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                {t('login.form.resendEmail')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
