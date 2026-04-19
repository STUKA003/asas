import { Link } from 'react-router-dom'
import { Scissors, Clock, Star, Shield, ChevronRight, Sparkles, CalendarCheck, Instagram, MessageCircle, TrendingUp, CheckCircle2, ArrowUpRight, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useTenant } from '@/providers/TenantProvider'
import { PageLoader } from '@/components/ui/Spinner'

const features = [
  { icon: CalendarCheck, title: 'Agendamento fácil',       desc: 'Reserve em segundos, sem ligações ou mensagens.' },
  { icon: Clock,         title: 'Horários em tempo real',  desc: 'Veja os horários disponíveis na hora.' },
  { icon: Star,          title: 'Melhores profissionais',  desc: 'Barbeiros experientes e dedicados.' },
  { icon: Shield,        title: 'Confirmação garantida',   desc: 'Receba confirmação imediata do seu agendamento.' },
]

const steps = [
  { n: '01', title: 'Escolha o serviço', desc: 'Selecione entre corte, barba, tratamentos e mais.' },
  { n: '02', title: 'Escolha o barbeiro', desc: 'Veja quem está disponível e escolha seu preferido.' },
  { n: '03', title: 'Escolha data e hora', desc: 'Veja os horários livres e reserve o seu.' },
  { n: '04', title: 'Confirmação', desc: 'Receba a confirmação e apareça no horário.' },
]

export default function Home() {
  const { slug, barbershop, loading } = useTenant()

  if (loading) return <PageLoader />

  const name = barbershop?.name ?? 'Trimio'
  const heroTitle = barbershop?.heroTitle || `${name} — no seu tempo.`
  const heroSubtitle = barbershop?.heroSubtitle || 'Agende seu horário sem ligações, sem esperar. Só escolher e aparecer.'
  const heroButtonText = barbershop?.heroButtonText || 'Agendar agora'
  const aboutText = barbershop?.aboutText || 'Uma experiência pensada para clientes que valorizam estilo, pontualidade e atendimento profissional.'
  const galleryImages = barbershop?.galleryImages ?? []
  const instagramHref = barbershop?.instagram
    ? `https://instagram.com/${barbershop.instagram.replace(/^@/, '')}`
    : null
  const whatsappHref = barbershop?.whatsapp
    ? `https://wa.me/${barbershop.whatsapp.replace(/\D/g, '')}`
    : null
  const promoButtonText = barbershop?.promoButtonText || 'Agendar promoção'
  const trustStats = [
    { label: 'Reserva média', value: '< 2 min', icon: Clock },
    { label: 'Confirmação', value: 'Instantânea', icon: CheckCircle2 },
    { label: 'Disponibilidade', value: 'Em tempo real', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0b0d12] text-white">
          {barbershop?.heroImageUrl && (
            <img
              src={barbershop.heroImageUrl}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover object-[center_top] sm:object-center opacity-25"
            />
          )}
          <div className="absolute inset-0 tenant-glow" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,10,15,0.7),rgba(8,10,15,0.92))]" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
              <div className="max-w-3xl">
                {barbershop?.logoUrl && (
                  <img
                    src={barbershop.logoUrl}
                    alt={name}
                    className="h-24 sm:h-28 md:h-32 w-auto max-w-[16rem] sm:max-w-[19rem] md:max-w-[22rem] object-contain mb-7 drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                  />
                )}
                <div className="tenant-chip mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
                  <Sparkles size={14} /> Agendamento online 24h
                </div>
                <h1 className="max-w-2xl text-4xl font-semibold leading-[0.92] text-balance sm:text-6xl">
                  {heroTitle}
                </h1>
                <p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-300 text-balance">
                  {heroSubtitle}
                </p>
                {barbershop?.address && (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400"><MapPin size={14} /> {barbershop.address}</p>
                )}
                {(instagramHref || whatsappHref) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {whatsappHref && (
                      <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                    )}
                    {instagramHref && (
                      <a href={instagramHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                        <Instagram size={14} />
                        Instagram
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link to={`/${slug}/booking`}>
                    <Button size="lg" className="tenant-button w-full min-w-[14rem] sm:w-auto">
                      {heroButtonText} <ChevronRight size={18} />
                    </Button>
                  </Link>
                  <Link to={`/${slug}/services`}>
                    <Button size="lg" variant="outline" className="w-full border-zinc-700/80 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white sm:w-auto">
                      Ver serviços
                    </Button>
                  </Link>
                </div>

                <div className="mt-12 grid gap-3 sm:grid-cols-3">
                  {trustStats.map((item) => (
                    <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                      <div className="tenant-soft-icon flex h-10 w-10 items-center justify-center rounded-2xl">
                        <item.icon size={16} />
                      </div>
                      <p className="mt-4 text-xl font-semibold tracking-tight">{item.value}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {barbershop?.promoEnabled && (barbershop.promoTitle || barbershop.promoText) && (
                <div className="lg:pt-16">
                  <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
                    <p className="tenant-ink text-xs font-semibold uppercase tracking-[0.18em]">Destaque da semana</p>
                    <h2 className="mt-3 text-2xl font-bold text-white">{barbershop.promoTitle || 'Promoção especial'}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{barbershop.promoText || 'Aproveite a campanha ativa desta barbearia e reserve o seu horário.'}</p>
                    <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Porque reservar online</p>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Evita esperas e chamadas.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Vês logo a próxima vaga.</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Garantes o teu profissional preferido.</li>
                      </ul>
                    </div>
                    <Link to={`/${slug}/booking`} className="mt-5 inline-block">
                      <Button size="lg" className="tenant-button">
                        {promoButtonText} <ChevronRight size={18} />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-transparent py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
              <div>
                <p className="eyebrow text-accent-600">Porque escolher</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950">Uma experiência de barbearia mais sólida desde a primeira reserva.</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-zinc-500">{aboutText}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="tenant-card rounded-[1.75rem] p-6">
                  <div className="tenant-soft-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                    <f.icon size={22} />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="text-sm leading-6 text-zinc-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {galleryImages.length > 0 && (
        <section className="bg-white/70 py-20 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="tenant-ink text-xs uppercase tracking-[0.18em] font-semibold">Galeria</p>
                  <h2 className="mt-2 text-3xl font-bold">O ambiente e o estilo da {name}</h2>
                </div>
                <p className="max-w-xl text-sm text-zinc-500">Cada barbearia pode mostrar o seu espaço, os seus cortes e a sua identidade visual.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {galleryImages.slice(0, 8).map((image, index) => (
                  <div
                    key={`${image.slice(0, 24)}-${index}`}
                    className={`overflow-hidden rounded-[1.75rem] ${
                      index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                    }`}
                  >
                    <img src={image} alt={`${name} galeria ${index + 1}`} className="h-64 w-full object-cover sm:h-full" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="tenant-ink eyebrow">Fluxo simples</p>
              <h2 className="mt-3 text-3xl font-semibold text-zinc-950">Reserva rápida, sensação premium.</h2>
              <p className="mt-3 text-zinc-500">Em menos de 2 minutos fechas tudo com clareza.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              <div className="absolute left-[12%] right-[12%] top-8 hidden h-0.5 bg-zinc-100 lg:block" />
              {steps.map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-xl font-black text-white shadow-[0_18px_30px_-18px_rgba(9,9,11,0.7)]">
                    {s.n}
                  </div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-zinc-950 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center text-white sm:px-6">
            <Scissors size={40} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-semibold">Pronto para um novo visual?</h2>
            <p className="mt-4 text-lg text-zinc-300">Agende agora e garante o teu horário na {name} sem esperas nem chamadas.</p>
            {(instagramHref || whatsappHref) && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
                {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/90 hover:text-white"><MessageCircle size={15} /> Falar no WhatsApp</a>}
                {instagramHref && <a href={instagramHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/90 hover:text-white"><Instagram size={15} /> Ver Instagram</a>}
              </div>
            )}
            <Link to={`/${slug}/booking`} className="mt-8 inline-block">
              <Button size="lg" className="min-w-[14rem] bg-white text-zinc-950 hover:bg-zinc-100">
                Agendar agora <ArrowUpRight size={18} />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
