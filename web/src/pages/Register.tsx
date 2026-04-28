import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Globe, Mail, Scissors } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { applyPlatformAccent } from '@/lib/theme'
import { normalizeSlug, slugify } from '@/lib/slug'
import { getInboxLink } from '@/lib/emailLinks'
import adminLogo from '@/assets/branding/barbershop-logo.png'

export default function Register() {
  const navigate    = useNavigate()
  const [slugManual, setSlugManual] = useState(false)
  const [resendMsg, setResendMsg]   = useState('')
  const [success, setSuccess]       = useState<{ email: string; slug: string } | null>(null)
  const { t } = useTranslation(['platform', 'common'])

  const schema = z.object({
    barbershopName: z.string().min(2, t('register.form.errors.shopNameRequired')),
    slug: z.string().min(2, t('register.form.errors.shopNameMin')).regex(/^[a-z0-9-]+$/, t('register.form.errors.slugInvalid')),
    name:     z.string().min(2, t('register.form.errors.ownerNameRequired')),
    email:    z.string().email(t('register.form.errors.emailInvalid')),
    password: z.string().min(6, t('register.form.errors.passwordMin')),
  })
  type FormData = z.infer<typeof schema>

  const FEATURES = [
    t('register.hero.feature1'),
    t('register.hero.feature2'),
    t('register.hero.feature3'),
    t('register.hero.feature4'),
    t('register.hero.feature5'),
  ]

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
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 20% -5%, rgba(99,102,241,0.16) 0%, transparent 55%), radial-gradient(ellipse 45% 35% at 85% 105%, rgba(79,70,229,0.08) 0%, transparent 50%)' }} />

        <div className="relative flex items-center gap-3">
          <img src={adminLogo} alt="Trimio" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-white">{t('register.brand.name')}</p>
            <p className="text-[11px] text-white/30">{t('register.brand.subtitle')}</p>
          </div>
        </div>

        <div className="relative">
          <p className="mb-5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">
            {t('register.hero.eyebrow')}
          </p>
          <h1 className="max-w-xs text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
            {t('register.hero.title')}
          </h1>
          <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/45">
            {t('register.hero.desc')}
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
            <p className="text-[12.5px] font-semibold text-white">{t('register.freePlan.title')}</p>
            <p className="mt-1 text-[12px] leading-5 text-white/40">{t('register.freePlan.desc')}</p>
          </div>
        </div>

        <p className="relative text-[11px] text-white/15">
          © {new Date().getFullYear()} Trimio
        </p>
      </div>

      {/* ── Right — form panel ────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={adminLogo} alt="Trimio" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-[14px] font-semibold tracking-tight text-ink">Trimio Studio</span>
        </div>

        <div className="w-full max-w-md">

          {success ? (
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100">
                <Mail size={24} className="text-success-600" />
              </div>
              <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
                {t('register.success.title')}
              </h2>
              <p className="text-[13.5px] leading-6 text-ink-muted">
                {t('register.success.message', { email: success.email })}
              </p>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4">
                <p className="text-[13px] font-semibold text-ink">{t('register.success.stepsTitle')}</p>
                <ol className="mt-2.5 space-y-1.5 text-[13px] text-ink-muted">
                  <li>{t('register.success.step1')}</li>
                  <li>{t('register.success.step2')}</li>
                  <li>{t('register.success.step3')}</li>
                  <li>{t('register.success.step4')}</li>
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
                    {t('register.success.openInbox')} <ArrowRight size={15} />
                  </Button>
                </a>
                <Button variant="secondary" className="w-full" onClick={() => resendMutation.mutate(success)} loading={resendMutation.isPending}>
                  {t('register.success.resendEmail')}
                </Button>
                <div className="flex gap-2.5">
                  <Button variant="ghost" className="flex-1" onClick={() => navigate('/admin/login')}>
                    {t('register.success.goToLogin')}
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => { setResendMsg(''); setSuccess(null) }}>
                    {t('register.success.createAnother')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Scissors size={28} className="mb-4 text-primary-600" />
                <h2 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-ink">
                  {t('register.hero.title')}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-6 text-ink-muted">
                  {t('register.hero.feature5')}
                </p>
              </div>

              <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
                <Input
                  label={t('register.form.shopNameLabel')}
                  placeholder={t('register.form.shopNamePlaceholder')}
                  error={errors.barbershopName?.message}
                  {...register('barbershopName')}
                  onChange={handleNameChange}
                />

                <div className="space-y-1.5">
                  <label className="ui-label">{t('register.form.slugLabel')}</label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-100/80 hover:border-neutral-300">
                    <span className="select-none pl-4 pr-1 text-[12.5px] text-ink-muted whitespace-nowrap">{t('register.form.slugPrefix')}</span>
                    <input
                      className="h-12 min-w-0 flex-1 pr-4 bg-transparent text-sm text-ink outline-none placeholder-ink-muted/50"
                      placeholder={t('register.form.slugPlaceholder')}
                      {...register('slug')}
                      onChange={(e) => { setSlugManual(true); setValue('slug', normalizeSlug(e.target.value)) }}
                    />
                  </div>
                  {errors.slug ? (
                    <p className="text-xs text-danger-600">{errors.slug.message}</p>
                  ) : slug ? (
                    <p className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                      <Globe size={11} /> {t('register.form.slugPrefix')}{slug}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('register.form.ownerNameLabel')} placeholder={t('register.form.ownerNamePlaceholder')} error={errors.name?.message} {...register('name')} />
                  <Input label={t('register.form.emailLabel')} type="email" placeholder={t('register.form.emailPlaceholder')} error={errors.email?.message} {...register('email')} />
                </div>

                <Input label={t('register.form.passwordLabel')} type="password" placeholder={t('register.form.passwordPlaceholder')} error={errors.password?.message} {...register('password')} />

                {apiError && (
                  <div className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
                    {apiError === 'Slug already taken' ? t('register.form.errors.slugTaken') : apiError}
                  </div>
                )}

                <Button type="submit" loading={isPending} size="lg" className="mt-1 w-full">
                  {t('register.form.submitButton')} <ArrowRight size={15} />
                </Button>
              </form>

              <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                <p className="text-[12.5px] text-ink-muted">
                  {t('register.form.hasAccount')}{' '}
                  <Link to="/admin/login" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
                    {t('register.form.login')}
                  </Link>
                </p>
              </div>

              <div className="mt-4 flex justify-center">
                <LanguageSelector compact />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
