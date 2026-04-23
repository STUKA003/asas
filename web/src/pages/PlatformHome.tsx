import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CalendarClock, BarChart2,
  Scissors, Store, Users, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import platformLogo from '@/assets/branding/platform-logo.png'
import { useInstallBrand } from '@/lib/installBrand'

const features = [
  {
    icon: Store,
    title: 'Página pública da barbearia',
    text: 'Link próprio com serviços, galeria, horários e botão de reserva. Pronto a partilhar.',
  },
  {
    icon: CalendarClock,
    title: 'Agendamento online',
    text: 'Os clientes escolhem serviço, barbeiro, data e hora. Sem chamadas, sem mensagens.',
  },
  {
    icon: Users,
    title: 'Gestão de equipa e agenda',
    text: 'Barbeiros com portal próprio, horários configuráveis e vista de agenda em tempo real.',
  },
  {
    icon: BarChart2,
    title: 'Relatórios e clientes',
    text: 'Histórico de reservas, faturação estimada e base de clientes centralizada.',
  },
]

const steps = [
  { n: '1', title: 'Cria a barbearia',    desc: 'Nome, endereço e link em menos de 2 minutos.' },
  { n: '2', title: 'Configura o negócio', desc: 'Barbeiros, serviços, horários e preços.' },
  { n: '3', title: 'Partilha e recebe',   desc: 'Partilha o link e as reservas chegam sozinhas.' },
]

export default function PlatformHome() {
  useEffect(() => { applyPlatformAccent() }, [])
  useInstallBrand('platform')

  return (
    <div className="min-h-screen bg-[#fafafc] text-ink">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={platformLogo} alt="Trimio" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-[14px] font-semibold tracking-tight text-ink">Trimio</span>
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

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0c0c11] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.18) 0%, transparent 60%)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 text-center">
            <div className="mx-auto max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-400/20 bg-primary-500/10 px-3.5 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-300">
                Plataforma para barbearias
              </p>

              <h1 className="text-balance text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:text-[3.6rem] lg:text-[4.2rem]">
                Site, reservas e gestão — num só lugar.
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-white/50">
                Cada barbearia tem a sua página pública para receber clientes online, e um painel completo para gerir a operação.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link to="/register">
                  <Button size="lg" className="min-w-[13rem]">
                    Criar conta grátis <ArrowRight size={15} />
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="min-w-[11rem] border-white/[0.14] bg-white/[0.05] text-white/75 hover:bg-white/[0.10] hover:text-white">
                    Entrar no painel
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-[12px] text-white/25">Grátis até 30 reservas/mês · Sem cartão de crédito</p>
            </div>

            {/* Stats strip */}
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
              {[
                { value: 'Grátis',    label: 'para começar' },
                { value: '< 2 min',   label: 'para configurar' },
                { value: '24h',       label: 'disponível para clientes' },
              ].map((s) => (
                <div key={s.label} className="bg-[#0c0c11] px-4 py-5">
                  <p className="text-[18px] font-semibold tracking-tight text-white">{s.value}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Funcionalidades ──────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.2rem]">
                O que o Trimio inclui
              </h2>
              <p className="mt-3 text-[14px] text-ink-muted">
                Tudo o que uma barbearia precisa para funcionar online.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-neutral-200/70 bg-white p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <f.icon size={18} />
                  </div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{f.title}</h3>
                  <p className="text-[13px] leading-5 text-ink-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Como funciona ────────────────────────────────────── */}
        <section className="border-t border-neutral-100 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.1rem]">
                  A começar em 3 passos
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-ink-muted">
                  Não é preciso instalar nada nem saber de tecnologia.
                </p>
                <div className="mt-8 space-y-3">
                  {steps.map((s) => (
                    <div key={s.n} className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-[13px] font-bold text-white">
                        {s.n}
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[14px] font-semibold text-ink">{s.title}</p>
                        <p className="mt-0.5 text-[13px] text-ink-muted">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* O que está incluído no plano grátis */}
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-6 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Plano gratuito</p>
                <p className="mt-2 text-[1.4rem] font-semibold tracking-tight text-ink">Começa sem pagar nada.</p>
                <p className="mt-2 text-[13px] leading-6 text-ink-muted">
                  Testa o produto completo com limites que fazem sentido para uma barbearia a arrancar.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    '1 barbeiro ativo',
                    '30 reservas por mês',
                    'Página pública com booking',
                    'Painel de gestão completo',
                    'Sem cartão de crédito',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink-soft">
                      <CheckCircle2 size={15} className="shrink-0 text-primary-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="mt-6 block">
                  <Button className="w-full" size="lg">
                    Criar conta grátis <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer mínimo ───────────────────────────────────── */}
        <footer className="border-t border-neutral-100 py-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <img src={platformLogo} alt="Trimio" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-[13px] font-medium text-ink-muted">Trimio</span>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-ink-muted">
              <Link to="/admin/login" className="hover:text-ink transition-colors">Entrar</Link>
              <Link to="/register" className="hover:text-ink transition-colors">Criar conta</Link>
            </div>
          </div>
        </footer>

      </main>
    </div>
  )
}
