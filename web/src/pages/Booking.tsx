import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { BookingStepper } from '@/components/booking/BookingStepper'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { StepService } from '@/components/booking/steps/StepService'
import { StepBarber } from '@/components/booking/steps/StepBarber'
import { StepDateTime } from '@/components/booking/steps/StepDateTime'
import { StepExtras } from '@/components/booking/steps/StepExtras'
import { StepCustomer } from '@/components/booking/steps/StepCustomer'
import { StepProducts } from '@/components/booking/steps/StepProducts'
import { StepConfirmation } from '@/components/booking/steps/StepConfirmation'
import { useBookingStore } from '@/store/booking'
import { useTenant } from '@/providers/TenantProvider'
import { CalendarCheck2, Clock3, Scissors, ShieldCheck, Sparkles } from 'lucide-react'

// Logic: 0=Serviço 1=Barbeiro 2=Data/Hora 3=Extras 4=Dados 5=Produtos 6=Confirmação
const steps = [StepService, StepBarber, StepDateTime, StepExtras, StepCustomer, StepProducts, StepConfirmation]

// Stepper shows only 5 — Extras(3) hides under Data/Hora, Produtos(5) hides under Dados
const stepLabels = ['Serviço', 'Barbeiro', 'Data/Hora', 'Dados', 'Confirmação']

function toDisplay(s: number) {
  if (s <= 2) return s
  if (s === 3) return 2  // Extras → Data/Hora active
  if (s <= 5) return s - 1
  return 4               // Confirmação
}
function toLogic(s: number) {
  if (s <= 2) return s
  if (s === 3) return 4  // click Dados → skip Extras
  return 6               // click Confirmação → skip Produtos
}

export default function Booking() {
  const { step, setStep } = useBookingStore()
  const { barbershop } = useTenant()
  const safeStep = Math.min(step, steps.length - 1)
  const StepComponent = steps[safeStep]

  useEffect(() => {
    if (step !== safeStep) setStep(safeStep)
  }, [safeStep, setStep, step])

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 tenant-glow [mask-image:linear-gradient(180deg,black,transparent)]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_24rem] lg:items-start lg:gap-10 lg:py-12">
          <section className="space-y-6">
            <div className="surface-panel rounded-[2rem] border border-white/70 px-5 py-5 sm:px-7 sm:py-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="eyebrow">Reserva premium</p>
                  <h1 className="mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl">Marca o teu horário com clareza e sem fricção.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                    Escolhe o serviço, confirma o profissional e fecha a tua reserva em poucos passos. A experiência foi desenhada para ser rápida, confiante e direta.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <Clock3 size={13} className="text-accent-500" />
                    Menos de 2 min
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    Confirmação imediata
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-zinc-200/70 bg-white/75 px-4 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.22)]">
                {barbershop?.logoUrl ? (
                  <img src={barbershop.logoUrl} alt={barbershop.name} className="h-16 w-auto max-w-[9rem] object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950">
                    <Scissors size={20} className="text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Sessão atual</p>
                  <p className="mt-1 truncate text-base font-semibold text-zinc-950">{barbershop?.name ?? 'Trimio'}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">Reserva digital com disponibilidade em tempo real.</p>
                </div>
              </div>
            </div>

            <BookingStepper
              current={toDisplay(safeStep)}
              steps={stepLabels}
              onStepClick={(i) => setStep(toLogic(i))}
            />

            <div className="surface-panel rounded-[2rem] border border-white/70 p-6 sm:p-7">
              <StepComponent />
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-ink-soft shadow-soft lg:hidden">
              <div className="flex items-center gap-2 font-medium text-ink">
                <CalendarCheck2 size={16} className="text-primary-600" />
                Resumo sempre visível
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                Assim que escolheres um serviço, mostramos aqui os dados principais da tua reserva.
              </p>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[1.75rem] border border-zinc-200/70 bg-zinc-950 p-5 text-white shadow-[0_24px_54px_-34px_rgba(9,9,11,0.55)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Experiência</p>
                  <p className="mt-2 text-xl font-semibold">Reserva orientada</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles size={18} className="text-accent-300" />
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <p>Vês horários reais, confirmas preferências e fechas tudo no mesmo fluxo.</p>
                <p className="text-zinc-500">Sem mensagens, sem espera, sem dúvida sobre disponibilidade.</p>
              </div>
            </div>

            {safeStep > 0 && safeStep < steps.length - 1 ? (
              <BookingSummary />
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/60 p-5 text-sm text-zinc-500">
                O resumo da tua reserva aparece aqui assim que escolheres o serviço.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
