import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Calendar, Clock3, Scissors, UserRound } from 'lucide-react'
import { barberAuthApi } from '@/lib/api'
import { useBarberAuthStore } from '@/store/barberAuth'
import { useInstallBrand } from '@/lib/installBrand'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { applyPlatformAccent } from '@/lib/theme'
import barberLogo from '@/assets/branding/barber-logo.png'

const schema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function BarberLogin() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { setAuth } = useBarberAuthStore()
  const [submitError, setSubmitError] = useState('')
  const { t } = useTranslation('barber')

  const FEATURES = [
    { icon: Calendar, label: t('login.panel.feature1Label'), desc: t('login.panel.feature1Desc') },
    { icon: UserRound, label: t('login.panel.feature2Label'), desc: t('login.panel.feature2Desc') },
    { icon: Clock3, label: t('login.panel.feature3Label'), desc: t('login.panel.feature3Desc') },
  ]

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: slugParam ?? '' },
  })

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  useInstallBrand('barber')

  const onSubmit = async (data: FormData) => {
    setSubmitError('')
    try {
      const res = await barberAuthApi.login(data)
      setAuth(res.token, { ...res.barber, barbershopId: res.barber.barbershopId ?? '' })
      navigate(`/${data.slug}/barber`)
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
          : 'Credenciais inválidas'

      setSubmitError(message === 'Invalid credentials' ? t('login.form.errors.invalidCredentials') : message)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div
        className="relative hidden w-[52%] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16"
        style={{ background: '#0d0d11' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 20% -10%, rgba(249,115,22,0.18) 0%, transparent 60%),' +
              'radial-gradient(ellipse 50% 40% at 85% 110%, rgba(251,146,60,0.10) 0%, transparent 55%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <img src={barberLogo} alt="Trimio Flow" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white">{t('login.brand.name')}</p>
            <p className="text-[11px] text-white/35">{t('login.brand.subtitle')}</p>
          </div>
        </div>

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
            {FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="flex items-start gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/20">
                  <feature.icon size={15} className="text-orange-300" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{feature.label}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/40">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/20">
          © {new Date().getFullYear()} Trimio · Portal operacional do barbeiro
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={barberLogo} alt="Trimio Flow" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-ink">Trimio Flow</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Scissors size={28} className="mb-4 text-orange-500" />
            <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">{t('login.form.title')}</h2>
            <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
              {t('login.form.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!slugParam ? (
              <Input
                label={t('login.form.slugLabel')}
                placeholder={t('login.form.slugPlaceholder')}
                autoComplete="organization"
                error={errors.slug?.message}
                {...register('slug')}
              />
            ) : null}
            <Input
              label={t('login.form.emailLabel')}
              type="email"
              placeholder={t('login.form.emailPlaceholder')}
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('login.form.passwordLabel')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {submitError ? (
              <div className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
                {submitError}
              </div>
            ) : null}

            <Button
              type="submit"
              loading={isSubmitting}
              size="lg"
              className="mt-1 w-full border-orange-500/90 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:border-orange-700 focus-visible:ring-orange-100"
            >
              {t('login.form.submitButton')}
              <ArrowRight size={15} />
            </Button>
            <div className="flex justify-center">
              <LanguageSelector compact />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
