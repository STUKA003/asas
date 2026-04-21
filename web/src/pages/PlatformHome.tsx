import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Scissors,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import platformLogo from '@/assets/branding/platform-logo.png'

const features = [
  {
    icon: CalendarClock,
    title: 'Agendamentos online',
    text: 'Cada barbearia ganha uma página própria para reservas, com horários em tempo real e fluxo simples para o cliente.',
  },
  {
    icon: Store,
    title: 'Site da barbearia',
    text: 'Além do painel, a barbearia passa a ter presença online com marca, serviços, promoções e link direto para booking.',
  },
  {
    icon: Users,
    title: 'Gestão operacional',
    text: 'Barbeiros, clientes, horários, relatórios e serviços ficam centralizados num sistema só.',
  },
  {
    icon: ShieldCheck,
    title: 'Ferramenta profissional',
    text: 'O foco não é só “marcar horários”. É dar controlo real à operação e uma imagem mais séria ao negócio.',
  },
]

const steps = [
  'Criar a barbearia e escolher o endereço.',
  'Configurar barbeiros, serviços e horários.',
  'Partilhar a página pública e começar a receber reservas.',
]

export default function PlatformHome() {
  useEffect(() => {
    applyPlatformAccent()
  }, [])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={platformLogo}
              alt="Trimio"
              className="h-11 w-11 rounded-2xl object-contain shadow-[0_18px_30px_-18px_rgba(9,9,11,0.7)]"
            />
            <div>
              <p className="text-base font-semibold tracking-tight text-zinc-950">Trimio</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Plataforma para barbearias</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/admin/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--accent-200),0.18),transparent_34rem),radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_28rem)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_25rem] lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-700">
                <Sparkles size={14} />
                Plataforma de reservas e gestão para barbearias
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.92] text-balance sm:text-6xl">
                O site, o booking e a operação da tua barbearia num só produto.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
                Quem entra no teu link consegue reservar online. Quem está dentro do sistema consegue gerir agenda,
                equipa, clientes e crescimento com mais controlo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="min-w-[15rem]">
                    Criar barbearia grátis <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="min-w-[14rem]">
                    Já tenho conta
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  { value: 'Página própria', label: 'para cada barbearia', icon: Store },
                  { value: 'Booking online', label: 'com horário real', icon: Clock3 },
                  { value: 'Painel completo', label: 'para gestão diária', icon: CheckCircle2 },
                ].map((item) => (
                  <div key={item.label} className="surface-panel rounded-[1.5rem] border border-white/70 px-4 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                      <item.icon size={16} />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-zinc-950">{item.value}</p>
                    <p className="mt-1 text-sm text-zinc-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-[2rem] border border-white/70 p-6 sm:p-7">
              <p className="eyebrow">O que isto faz</p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-950">Não é só um login.</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                É uma plataforma que dá à barbearia uma frente pública para vender e uma área interna para operar.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  'Landing e página pública da barbearia',
                  'Reserva online para clientes',
                  'Painel admin com agenda, clientes e equipa',
                  'Portal do barbeiro para acompanhar o dia',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.25rem] border border-zinc-200/70 bg-white/75 px-4 py-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                      <CheckCircle2 size={14} />
                    </div>
                    <p className="text-sm leading-6 text-zinc-600">{item}</p>
                  </div>
                ))}
              </div>

              <Link to="/register" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-700 hover:text-accent-800">
                Começar agora <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
              <div>
                <p className="eyebrow text-accent-600">Clareza de produto</p>
                <h2 className="mt-3 text-3xl font-semibold text-zinc-950">Quem entra no domínio principal precisa de perceber o produto em segundos.</h2>
              </div>
              <p className="text-sm leading-6 text-zinc-500">
                Esta página passa a explicar o Trimio. O login fica como acesso secundário para quem já é cliente.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="surface-panel rounded-[1.75rem] border border-white/70 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-600">
                    <feature.icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-zinc-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="surface-panel rounded-[2rem] border border-white/70 p-6 sm:p-8">
              <p className="eyebrow text-accent-600">Como começa</p>
              <h2 className="mt-3 text-3xl font-semibold text-zinc-950">Setup simples, resultado imediato.</h2>
              <div className="mt-8 space-y-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-[1.5rem] border border-zinc-200/70 bg-white/80 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-zinc-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-zinc-950 p-6 text-white shadow-[0_30px_80px_-42px_rgba(9,9,11,0.65)] sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">CTA principal</p>
              <h2 className="mt-3 text-3xl font-semibold">Cria a tua barbearia e começa com o plano grátis.</h2>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                O domínio principal serve para vender a plataforma. O teu login continua disponível em separado.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/register">
                  <Button size="lg" className="w-full bg-white text-zinc-950 hover:bg-zinc-100">
                    Criar conta agora <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    Entrar no painel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
