import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, Check, ChevronDown,
  Calendar, Users, BarChart2, Smartphone,
  MessageSquareOff, PhoneOff, Clock, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import platformLogo from '@/assets/branding/platform-logo.png'
import { useInstallBrand } from '@/lib/installBrand'
import { cn } from '@/lib/utils'

/* ─── Sub-components ──────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full rounded-2xl border border-neutral-200/70 bg-white px-5 py-4 text-left transition-all duration-150 hover:border-neutral-300"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-medium text-ink">{q}</span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-ink-muted transition-transform duration-200', open && 'rotate-180')}
        />
      </div>
      {open && (
        <p className="mt-3 text-[13px] leading-6 text-ink-muted">{a}</p>
      )}
    </button>
  )
}

/* ─── Booking mockup ──────────────────────────────────────────── */
function BookingMockup() {
  const { t } = useTranslation('platform')
  return (
    <div className="relative mx-auto w-full max-w-[320px] select-none">
      {/* Phone frame */}
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-neutral-800 bg-white shadow-[0_32px_64px_rgba(0,0,0,0.28),0_8px_24px_rgba(0,0,0,0.16)]">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#0c0c11] px-4 py-2">
          <span className="text-[10px] font-semibold text-white/60">9:41</span>
          <div className="flex gap-1">
            {[3,2,3].map((h, i) => (
              <div key={i} className="w-1 rounded-sm bg-white/50" style={{ height: h * 3 }} />
            ))}
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111116]">
            <span className="text-[11px] font-bold text-white">SB</span>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink">Stuka Barber</p>
            <p className="text-[10px] text-ink-muted">{t('home.mockup.shopLocation')}</p>
          </div>
        </div>
        {/* Content */}
        <div className="bg-[#f7f7fa] px-3.5 py-4 space-y-3">
          {/* Service selected */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('home.mockup.service')}</p>
            <div className="flex items-center justify-between rounded-xl border-[1.5px] border-primary-400 bg-primary-50/60 px-3 py-2.5"
              style={{ boxShadow: '0 0 0 3px rgba(129,140,248,0.15)' }}>
              <div>
                <p className="text-[12px] font-semibold text-ink">{t('home.mockup.serviceName')}</p>
                <p className="text-[10px] text-ink-muted">60 min</p>
              </div>
              <p className="text-[13px] font-semibold text-primary-700">15€</p>
            </div>
          </div>
          {/* Barber */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('home.mockup.barber')}</p>
            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">ST</div>
              <p className="text-[12px] font-semibold text-ink">Stuka</p>
            </div>
          </div>
          {/* Time slots */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('home.mockup.tomorrow')}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['10:00','10:30','11:00','12:00','14:30','15:00'].map((t, i) => (
                <div key={t} className={cn(
                  'rounded-lg py-1.5 text-center text-[11px] font-medium',
                  i === 2
                    ? 'bg-primary-600 text-white'
                    : 'border border-neutral-200 bg-white text-ink-soft'
                )}>{t}</div>
              ))}
            </div>
          </div>
          {/* CTA */}
          <div className="rounded-xl bg-primary-600 py-2.5 text-center">
            <p className="text-[12px] font-semibold text-white">{t('home.mockup.confirmBooking')}</p>
          </div>
        </div>
      </div>
      {/* Floating notification */}
      <div className="absolute -right-4 top-24 w-[160px] animate-slide-up rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-strong">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success-50">
            <Check size={12} className="text-success-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink">{t('home.mockup.bookingConfirmed')}</p>
            <p className="text-[10px] text-ink-muted">{t('home.mockup.bookingDate')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function PlatformHome() {
  const { t } = useTranslation('platform')
  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('platform')
  const localizedPains = [
    { icon: MessageSquareOff, title: t('home.pain.pain1Title'), text: t('home.pain.pain1Desc') },
    { icon: PhoneOff, title: t('home.pain.pain2Title'), text: t('home.pain.pain2Desc') },
    { icon: Clock, title: t('home.pain.pain3Title'), text: t('home.pain.pain3Desc') },
  ]
  const localizedBenefits = [
    { icon: Calendar, title: t('home.benefits.b1Title'), text: t('home.benefits.b1Desc') },
    { icon: Users, title: t('home.benefits.b2Title'), text: t('home.benefits.b2Desc') },
    { icon: Smartphone, title: t('home.benefits.b3Title'), text: t('home.benefits.b3Desc') },
    { icon: BarChart2, title: t('home.benefits.b4Title'), text: t('home.benefits.b4Desc') },
  ]
  const localizedPlans = [
    {
      id: 'FREE',
      name: t('home.pricing.freeName'),
      price: '0€',
      period: t('home.pricing.freePeriod'),
      highlight: false,
      description: t('home.pricing.freeDesc'),
      features: [1, 2, 3, 4, 5].map((n) => t(`home.pricing.freeFeature${n}`)),
      cta: t('home.pricing.startFree'),
      note: null,
    },
    {
      id: 'BASIC',
      name: t('home.pricing.basicName'),
      price: '19€',
      period: t('home.pricing.basicPeriod'),
      highlight: true,
      description: t('home.pricing.basicDesc'),
      features: [1, 2, 3, 4, 5, 6].map((n) => t(`home.pricing.basicFeature${n}`)),
      cta: t('home.pricing.startFree'),
      note: t('home.pricing.basicNote'),
    },
    {
      id: 'PRO',
      name: t('home.pricing.proName'),
      price: '39€',
      period: t('home.pricing.proPeriod'),
      highlight: false,
      description: t('home.pricing.proDesc'),
      features: [1, 2, 3, 4, 5, 6].map((n) => t(`home.pricing.proFeature${n}`)),
      cta: t('home.pricing.startFree'),
      note: null,
    },
  ]
  const localizedFaqs = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
  ]
  const testimonials = [1, 2, 3].map((n) => ({
    name: t(`home.testimonials.items.${n}.name`),
    role: t(`home.testimonials.items.${n}.role`),
    stars: 5,
    text: t(`home.testimonials.items.${n}.text`),
  }))

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafafc] text-ink">

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={platformLogo} alt="Trimio" className="h-8 w-8 rounded-xl object-contain" />
            <span className="text-[14px] font-semibold text-ink" style={{ letterSpacing: '-0.01em' }}>Trimio</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin/login">
              <Button variant="ghost" size="sm">{t('home.nav.login')}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                {t('home.nav.startFree')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ─── Hero ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0b0c11]">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.22) 0%, transparent 55%)',
          }} />
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{
            width: 600, height: 1, boxShadow: '0 0 120px 40px rgba(99,102,241,0.10)',
          }} />

          <div className="relative mx-auto max-w-6xl px-4 pb-0 pt-20 sm:px-6 sm:pt-28">
            <div className="grid gap-16 lg:grid-cols-[1fr_400px] lg:items-end">

              {/* Left — copy */}
              <div className="pb-20 sm:pb-24">
                {/* Pill */}
                <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary-400/20 bg-primary-500/10 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                  <span className="text-[11.5px] font-semibold text-primary-300" style={{ letterSpacing: '0.04em' }}>
                    {t('home.hero.pill')}
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-balance text-[2.8rem] font-semibold leading-[0.90] text-white sm:text-[3.8rem] lg:text-[4.4rem]"
                  style={{ letterSpacing: '-0.04em' }}>
                  {t('home.hero.line1')}{' '}
                  <span className="text-white/40">{t('home.hero.line2')}</span>
                </h1>

                {/* Sub */}
                <p className="mt-6 max-w-md text-[15px] leading-[1.65] text-white/50">
                  {t('home.hero.desc')}
                </p>

                {/* CTA */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto sm:min-w-[200px]">
                      {t('home.hero.cta')}
                      <ArrowRight size={15} />
                    </Button>
                  </Link>
                  <p className="text-[12.5px] text-white/30">
                    {t('home.hero.ctaNote')}
                  </p>
                </div>

                {/* Social proof numbers */}
                <div className="mt-12 flex items-center gap-6 border-t border-white/[0.07] pt-8">
                  {[
                    { val: t('home.hero.stat1Value'), label: t('home.hero.stat1Label') },
                    { val: t('home.hero.stat2Value'), label: t('home.hero.stat2Label') },
                    { val: t('home.hero.stat3Value'), label: t('home.hero.stat3Label') },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-[18px] font-semibold text-white" style={{ letterSpacing: '-0.03em' }}>{s.val}</p>
                      <p className="text-[11px] text-white/30">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — mockup */}
              <div className="hidden lg:block lg:self-end">
                <BookingMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pain section ────────────────────────────────────────── */}
        <section className="border-t border-neutral-200/60 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 max-w-xl">
              <p className="eyebrow mb-3">{t('home.pain.section')}</p>
              <h2 className="text-[1.75rem] font-semibold text-ink sm:text-[2.1rem]"
                style={{ letterSpacing: '-0.03em' }}>
                {t('home.pain.title')}
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-ink-muted">
                {t('home.pain.desc')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {localizedPains.map((p) => (
                <div key={p.title} className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-danger-50 text-danger-500">
                    <p.icon size={17} />
                  </div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{p.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-ink-muted">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Solution / how it works ─────────────────────────────── */}
        <section className="border-t border-neutral-100 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="eyebrow mb-3">{t('home.howItWorks.section')}</p>
              <h2 className="text-[1.75rem] font-semibold text-ink sm:text-[2.1rem]"
                style={{ letterSpacing: '-0.03em' }}>
                {t('home.howItWorks.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] text-ink-muted">
                {t('home.howItWorks.desc')}
              </p>
            </div>

            <div className="relative grid gap-8 sm:grid-cols-3">
              {/* Connector line (desktop) */}
              <div className="absolute left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] top-5 hidden h-px bg-neutral-200 sm:block" />

              {[
                { n: '1', title: t('home.howItWorks.step1Title'), desc: t('home.howItWorks.step1Desc') },
                { n: '2', title: t('home.howItWorks.step2Title'), desc: t('home.howItWorks.step2Desc') },
                { n: '3', title: t('home.howItWorks.step3Title'), desc: t('home.howItWorks.step3Desc') },
              ].map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
                    {s.n}
                  </div>
                  <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink">{s.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-ink-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Benefits ───────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="eyebrow mb-3">{t('home.benefits.section')}</p>
              <h2 className="text-[1.75rem] font-semibold text-ink sm:text-[2.1rem]"
                style={{ letterSpacing: '-0.03em' }}>
                {t('home.benefits.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] text-ink-muted">
                {t('home.benefits.desc')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {localizedBenefits.map((b) => (
                <div key={b.title} className="group rounded-2xl border border-neutral-200/70 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-medium">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                    <b.icon size={18} />
                  </div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{b.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-ink-muted">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <p className="eyebrow mb-3">{t('home.testimonials.section')}</p>
              <h2 className="text-[1.75rem] font-semibold text-ink sm:text-[2rem]"
                style={{ letterSpacing: '-0.03em' }}>
                {t('home.testimonials.title')}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="flex flex-col rounded-2xl border border-neutral-200/70 bg-white p-5">
                  {/* Stars */}
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} size={13} className="fill-warning-400 text-warning-400" />
                    ))}
                  </div>
                  <p className="flex-1 text-[13.5px] leading-[1.65] text-ink-soft">"{t.text}"</p>
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                    <p className="text-[12px] text-ink-muted">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─────────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 bg-white py-16 sm:py-24" id="precos">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="eyebrow mb-3">{t('home.pricing.section')}</p>
              <h2 className="text-[1.75rem] font-semibold text-ink sm:text-[2.1rem]"
                style={{ letterSpacing: '-0.03em' }}>
                {t('home.pricing.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[14px] text-ink-muted">
                {t('home.pricing.desc')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {localizedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-2xl p-6',
                    plan.highlight
                      ? 'border-2 border-primary-500 bg-white shadow-[0_0_0_6px_rgba(var(--primary-100),0.4),0_4px_16px_rgba(0,0,0,0.08)]'
                      : 'border border-neutral-200/70 bg-white'
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-primary-600 px-3 py-1 text-[11px] font-semibold text-white">
                        {t('home.pricing.popular')}
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <p className="text-[13px] font-semibold text-ink-muted">{plan.name}</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[2rem] font-semibold text-ink" style={{ letterSpacing: '-0.04em' }}>
                        {plan.price}
                      </span>
                      <span className="text-[13px] text-ink-muted">{plan.period}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-muted">{plan.description}</p>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px] text-ink-soft">
                        <Check size={14} className="shrink-0 text-success-600" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to="/register">
                    <Button
                      className="w-full"
                      variant={plan.highlight ? 'primary' : 'secondary'}
                      size="md"
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  {plan.note && (
                    <p className="mt-2.5 text-center text-[11.5px] text-ink-muted">{plan.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─────────────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <p className="eyebrow mb-3">{t('home.faq.section')}</p>
              <h2 className="text-[1.6rem] font-semibold text-ink" style={{ letterSpacing: '-0.03em' }}>
                {t('home.faq.title')}
              </h2>
            </div>
            <div className="space-y-2">
              {localizedFaqs.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ───────────────────────────────────────────── */}
        <section className="border-t border-neutral-200/60">
          <div className="relative overflow-hidden bg-[#0b0c11] py-20 sm:py-28">
            <div className="pointer-events-none absolute inset-0" style={{
              background: 'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(99,102,241,0.15) 0%, transparent 60%)',
            }} />
            <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
              <h2 className="text-[2rem] font-semibold text-white sm:text-[2.6rem]"
                style={{ letterSpacing: '-0.04em' }}>
                {t('home.finalCta.title')}
                <span className="block text-white/35">{t('home.finalCta.titleAccent')}</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-white/45">
                {t('home.finalCta.desc')}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link to="/register">
                  <Button size="lg" className="min-w-[200px]">
                    {t('home.finalCta.createAccount')}
                    <ArrowRight size={15} />
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-w-[160px] border-white/[0.12] bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white"
                  >
                    {t('home.finalCta.alreadyHaveAccount')}
                  </Button>
                </Link>
              </div>
              <p className="mt-5 text-[12px] text-white/20">
                {t('home.finalCta.note')}
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src={platformLogo} alt="Trimio" className="h-7 w-7 rounded-lg object-contain" />
            <span className="text-[13px] font-medium text-ink-muted">Trimio</span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-ink-muted">
            <Link to="/#precos" className="transition-colors hover:text-ink">{t('home.nav.pricing')}</Link>
            <Link to="/admin/login" className="transition-colors hover:text-ink">{t('home.nav.login')}</Link>
            <Link to="/register" className="transition-colors hover:text-ink">{t('home.footer.createAccount')}</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
