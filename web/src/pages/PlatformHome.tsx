import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CalendarClock, CheckCircle2,
  Clock3, Scissors, ShieldCheck, Sparkles, Store, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import platformLogo from '@/assets/branding/platform-logo.png'
import { useInstallBrand } from '@/lib/installBrand'

const features = [
  { icon: CalendarClock, title: 'Agendamentos online',    text: 'Cada barbearia ganha uma página própria com reservas, horários em tempo real e fluxo simples para o cliente.' },
  { icon: Store,         title: 'Site da barbearia',      text: 'Presença online com marca, serviços, promoções e link direto para booking — sem configuração técnica.' },
  { icon: Users,         title: 'Gestão operacional',     text: 'Barbeiros, clientes, horários, relatórios e serviços centralizados num sistema só.' },
  { icon: ShieldCheck,   title: 'Ferramenta profissional',text: 'O foco não é só marcar horários. É dar controlo real à operação e uma imagem mais séria ao negócio.' },
]

const steps = [
  { n: '01', title: 'Criar a barbearia',     desc: 'Escolhe o nome e o endereço da tua página em segundos.' },
  { n: '02', title: 'Configurar o negócio',  desc: 'Adiciona barbeiros, serviços, horários e preços.' },
  { n: '03', title: 'Partilhar e receber',   desc: 'Partilha o link e começa a receber reservas online de imediato.' },
]

const highlights = [
  'Landing e página pública da barbearia',
  'Reserva online para clientes',
  'Painel admin com agenda, clientes e equipa',
  'Portal do barbeiro para acompanhar o dia',
]

export default function PlatformHome() {
  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('platform')

  return (
    <div className="min-h-screen bg-[#fafafc] text-ink">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={platformLogo} alt="Trimio" className="h-10 w-10 rounded-xl object-contain" />
            <div>
              <p className="text-[13.5px] font-semibold tracking-tight text-ink">Trimio</p>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Plataforma para barbearias</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin/login">
              <Button variant="secondary" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0c0c11] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(99,102,241,0.20) 0%, transparent 60%),' +
                'radial-gradient(ellipse 40% 30% at 10% 90%,  rgba(79,70,229,0.08) 0%, transparent 50%)',
            }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_22rem] lg:items-center lg:py-32">
            <div>
              {/* Chip */}
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary-400/20 bg-primary-500/10 px-3.5 py-1 text-[12.5px] font-semibold text-primary-300">
                <Sparkles size={12} /> Plataforma de reservas e gestão para barbearias
              </div>

              <h1 className="max-w-3xl text-balance text-[2.8rem] font-semibold leading-[0.9] tracking-[-0.04em] text-white sm:text-[4rem] lg:text-[4.8rem]">
                O site, o booking e a operação num só produto.
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/55">
                Quem entra no teu link consegue reservar online. Quem está dentro do sistema consegue gerir agenda, equipa, clientes e crescimento com mais controlo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="tenant-button min-w-[14rem]">
                    Criar barbearia grátis <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="min-w-[12rem] border-white/[0.14] bg-white/[0.05] text-white/80 hover:bg-white/[0.10] hover:text-white">
                    Já tenho conta
                  </Button>
                </Link>
              </div>

              {/* Mini stat cards */}
              <div className="mt-12 grid gap-2.5 sm:grid-cols-3">
                {[
                  { value: 'Página própria',  label: 'para cada barbearia', icon: Store },
                  { value: 'Booking online',  label: 'com horário real',    icon: Clock3 },
                  { value: 'Painel completo', label: 'para gestão diária',  icon: CheckCircle2 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]">
                      <item.icon size={15} className="text-white/60" />
                    </div>
                    <p className="text-[15px] font-semibold tracking-tight text-white">{item.value}</p>
                    <p className="mt-0.5 text-[12px] text-white/40">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature list card */}
            <div className="rounded-3xl border border-white/[0.09] bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
              <p className="eyebrow mb-3 text-white/30">O que isto faz</p>
              <h2 className="text-[1.4rem] font-semibold tracking-tight text-white">Não é só um login.</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-white/45">
                É uma plataforma que dá à barbearia uma frente pública para vender e uma área interna para operar.
              </p>

              <div className="mt-6 space-y-2">
                {highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/20">
                      <CheckCircle2 size={13} className="text-primary-300" />
                    </div>
                    <p className="text-[13px] text-white/65">{item}</p>
                  </div>
                ))}
              </div>

              <Link to="/register" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-300 transition-colors hover:text-primary-200">
                Começar agora <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
              <div>
                <p className="eyebrow mb-3 tenant-ink">Clareza de produto</p>
                <h2 className="max-w-xl text-balance text-[1.9rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                  Quem entra percebe o produto em segundos.
                </h2>
              </div>
              <p className="max-w-sm text-[14px] leading-7 text-ink-muted">
                Esta página explica o Trimio. O login fica como acesso secundário para quem já é cliente.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-medium">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                    <f.icon size={19} />
                  </div>
                  <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-ink">{f.title}</h3>
                  <p className="text-[13px] leading-6 text-ink-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works + CTA ─────────────────────────── */}
        <section className="pb-24 pt-4 sm:pb-32">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2">

            {/* Steps */}
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-8">
              <p className="eyebrow mb-3 tenant-ink">Como começa</p>
              <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-ink">
                Setup simples, resultado imediato.
              </h2>
              <div className="mt-8 space-y-3">
                {steps.map((s) => (
                  <div key={s.n} className="flex gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-[13px] font-bold text-white"
                      style={{ boxShadow: '0 8px 16px -8px rgba(15,15,22,0.5)' }}
                    >
                      {s.n}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[13.5px] font-semibold text-ink">{s.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA dark card */}
            <div
              className="relative overflow-hidden rounded-2xl p-7 text-white sm:p-8"
              style={{ background: '#0c0c11' }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 60%)' }}
              />
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07]">
                  <Scissors size={20} className="text-white/60" />
                </div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/25">CTA principal</p>
                <h2 className="mt-3 text-[1.8rem] font-semibold leading-tight tracking-[-0.03em] text-white">
                  Cria a tua barbearia e começa grátis.
                </h2>
                <p className="mt-4 text-[14px] leading-6 text-white/45">
                  Começas com 1 barbeiro e 30 agendamentos por mês sem pagar nada. Upgrades quando quiseres crescer.
                </p>
                <div className="mt-8 flex flex-col gap-2.5">
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="w-full bg-white text-[#0c0c11] shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-neutral-100 active:bg-neutral-200"
                    >
                      Criar conta agora <ArrowRight size={16} />
                    </Button>
                  </Link>
                  <Link to="/admin/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-white/[0.12] bg-white/[0.05] text-white/75 hover:bg-white/[0.09] hover:text-white"
                    >
                      Entrar no painel
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
