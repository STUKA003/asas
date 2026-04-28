import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Scissors, Clock, Star, Shield, ChevronRight, Sparkles, CalendarCheck, Instagram, MessageCircle, TrendingUp, CheckCircle2, ArrowRight, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useTenant } from '@/providers/TenantProvider'
import { PageLoader } from '@/components/ui/Spinner'

export default function Home() {
  const { slug, barbershop, loading } = useTenant()
  const { t } = useTranslation('public')

  if (loading) return <PageLoader />

  const name            = barbershop?.name ?? 'Trimio'
  const heroTitle       = barbershop?.heroTitle       || `${name} — no seu tempo.`
  const heroSubtitle    = barbershop?.heroSubtitle    || t('header.bookNow')
  const heroButtonText  = barbershop?.heroButtonText  || t('header.bookNow')
  const aboutText       = barbershop?.aboutText       || ''
  const galleryImages   = barbershop?.galleryImages   ?? []
  const promoButtonText = barbershop?.promoButtonText || t('header.bookNow')

  const instagramHref = barbershop?.instagram
    ? `https://instagram.com/${barbershop.instagram.replace(/^@/, '')}`
    : null
  const whatsappHref = barbershop?.whatsapp
    ? `https://wa.me/${barbershop.whatsapp.replace(/\D/g, '')}`
    : null

  const features = [
    { icon: CalendarCheck, title: t('home.features.easyBooking'),           desc: t('home.features.easyBookingDesc') },
    { icon: Clock,         title: t('home.features.realTimeSlots'),         desc: t('home.features.realTimeSlotsDesc') },
    { icon: Star,          title: t('home.features.bestPros'),              desc: t('home.features.bestProsDesc') },
    { icon: Shield,        title: t('home.features.guaranteedConfirmation'), desc: t('home.features.guaranteedConfirmationDesc') },
  ]

  const steps = [
    { n: '01', title: t('home.howItWorks.step1Title'), desc: t('home.howItWorks.step1Desc') },
    { n: '02', title: t('home.howItWorks.step2Title'), desc: t('home.howItWorks.step2Desc') },
    { n: '03', title: t('home.howItWorks.step3Title'), desc: t('home.howItWorks.step3Desc') },
    { n: '04', title: t('home.howItWorks.step4Title'), desc: t('home.howItWorks.step4Desc') },
  ]

  const trustStats = [
    { label: t('home.stats.avgBooking'),    value: t('home.stats.avgBookingVal'),    icon: Clock },
    { label: t('home.stats.confirmation'),  value: t('home.stats.confirmationVal'),  icon: CheckCircle2 },
    { label: t('home.stats.availability'),  value: t('home.stats.availabilityVal'),  icon: TrendingUp },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0b0d12] text-white">
          {barbershop?.heroImageUrl && (
            <img
              src={barbershop.heroImageUrl}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover object-[center_top] opacity-20 sm:object-center"
            />
          )}
          <div className="absolute inset-0 tenant-glow" />
          <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(8,10,15,0.55),rgba(8,10,15,0.90))]" />
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary-500/[0.07] blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-500/[0.06] blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-36">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div>
                <div className="mb-6 flex items-center gap-4">
                  {barbershop?.logoUrl && (
                    <div className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                      <img src={barbershop.logoUrl} alt={name} className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
                    </div>
                  )}
                  <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{name}</p>
                </div>

                <h1 className="max-w-2xl text-balance text-[2.8rem] font-semibold leading-[0.9] tracking-[-0.04em] text-white sm:text-[4.2rem] lg:text-[5rem]">
                  {heroTitle}
                </h1>
                <p className="mt-6 max-w-xl text-balance text-[15px] leading-7 text-white/60 sm:text-base">
                  {heroSubtitle}
                </p>

                {barbershop?.address && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-white/40">
                    <MapPin size={13} /> {barbershop.address}
                  </p>
                )}

                {(instagramHref || whatsappHref) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {whatsappHref && (
                      <a href={whatsappHref} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-white/70 transition-all hover:bg-white/[0.10] hover:text-white">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                    {instagramHref && (
                      <a href={instagramHref} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-white/70 transition-all hover:bg-white/[0.10] hover:text-white">
                        <Instagram size={13} /> Instagram
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link to={`/${slug}/booking`}>
                    <Button size="lg" className="tenant-button w-full min-w-[13rem] sm:w-auto">
                      {heroButtonText} <ChevronRight size={16} />
                    </Button>
                  </Link>
                  <Link to={`/${slug}/services`}>
                    <Button size="lg" variant="outline"
                      className="w-full border-white/[0.14] bg-white/[0.05] text-white/80 hover:bg-white/[0.10] hover:text-white sm:w-auto">
                      {t('header.services')}
                    </Button>
                  </Link>
                </div>

                <div className="mt-12 grid gap-2.5 sm:grid-cols-3">
                  {trustStats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
                      <div className="tenant-soft-icon mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                        <item.icon size={15} />
                      </div>
                      <p className="text-[18px] font-semibold tracking-tight text-white">{item.value}</p>
                      <p className="mt-0.5 text-[12px] text-white/40">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promo card */}
              {barbershop?.promoEnabled && (barbershop.promoTitle || barbershop.promoText) && (
                <div className="lg:pt-20">
                  <div className="rounded-3xl border border-white/[0.10] bg-white/[0.07] p-6 shadow-2xl shadow-black/20 backdrop-blur-lg">
                    <p className="tenant-ink text-[10.5px] font-semibold uppercase tracking-[0.2em]">
                      {t('home.promo.label')}
                    </p>
                    <h2 className="mt-3 text-[22px] font-semibold leading-tight text-white">
                      {barbershop.promoTitle || t('home.promo.defaultTitle')}
                    </h2>
                    <p className="mt-3 text-[13px] leading-6 text-white/55">
                      {barbershop.promoText || t('home.promo.defaultText')}
                    </p>
                    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4">
                      <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/35">
                        {t('home.promo.whyBook')}
                      </p>
                      <ul className="mt-3 space-y-2 text-[13px] text-white/70">
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> {t('home.promo.bullet1')}</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> {t('home.promo.bullet2')}</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> {t('home.promo.bullet3')}</li>
                      </ul>
                    </div>
                    <Link to={`/${slug}/booking`} className="mt-5 inline-block">
                      <Button size="lg" className="tenant-button">{promoButtonText} <ChevronRight size={16} /></Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
              <div>
                <p className="eyebrow mb-3 tenant-ink">{t('home.features.section')}</p>
                <h2 className="max-w-xl text-balance text-[1.9rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                  {t('home.features.title')}
                </h2>
              </div>
              <p className="max-w-sm text-[14px] leading-7 text-ink-muted">{aboutText}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="tenant-card rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="tenant-soft-icon mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
                    <f.icon size={20} />
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-semibold tracking-tight text-ink">{f.title}</h3>
                  <p className="text-[13px] leading-6 text-ink-muted">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gallery ──────────────────────────────────────── */}
        {galleryImages.length > 0 && (
          <section className="border-y border-neutral-100 bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow mb-3 tenant-ink">{t('home.gallery.section')}</p>
                  <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-ink">
                    {t('home.gallery.title', { name })}
                  </h2>
                </div>
                <p className="max-w-sm text-[13px] leading-6 text-ink-muted">{t('home.gallery.subtitle')}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {galleryImages.slice(0, 8).map((image, index) => (
                  <div key={`${image.slice(0, 24)}-${index}`}
                    className={`overflow-hidden rounded-2xl ${index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
                    <img src={image} alt={`${name} ${index + 1}`} className="h-64 w-full object-cover sm:h-full" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── How it works ─────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-16 text-center">
              <p className="eyebrow mb-3 tenant-ink">{t('home.howItWorks.section')}</p>
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.2rem]">
                {t('home.howItWorks.title')}
              </h2>
              <p className="mt-2 text-[14px] text-ink-muted">{t('home.howItWorks.subtitle')}</p>
            </div>

            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-neutral-200 lg:block" />
              {steps.map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-ink" style={{ boxShadow: '0 12px 28px -10px rgba(15,15,22,0.55)' }} />
                    <span className="relative text-[17px] font-bold tracking-tight text-white">{s.n}</span>
                  </div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{s.title}</h3>
                  <p className="text-[13px] leading-6 text-ink-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0c0c11] py-24">
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 120%, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />
          <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.07]">
              <Scissors size={24} className="text-white/60" />
            </div>
            <h2 className="text-balance text-[2rem] font-semibold tracking-[-0.04em] text-white sm:text-[2.6rem]">
              {t('home.cta.title')}
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-white/50">
              {t('home.cta.subtitle', { name })}
            </p>
            {(instagramHref || whatsappHref) && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[13px]">
                {whatsappHref && (
                  <a href={whatsappHref} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/40 transition-colors hover:text-white/70">
                    <MessageCircle size={14} /> {t('home.social.whatsapp')}
                  </a>
                )}
                {instagramHref && (
                  <a href={instagramHref} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/40 transition-colors hover:text-white/70">
                    <Instagram size={14} /> {t('home.social.instagram')}
                  </a>
                )}
              </div>
            )}
            <Link to={`/${slug}/booking`} className="mt-8 inline-block">
              <Button size="lg"
                className="min-w-[13rem] bg-white text-[#0c0c11] shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-neutral-50 active:bg-neutral-100">
                {t('header.bookNow')} <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
