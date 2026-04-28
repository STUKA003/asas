import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Scissors } from 'lucide-react'

// Logic: 0=Service 1=Barber 2=DateTime 3=Extras 4=Customer 5=Products 6=Confirmation
const steps = [StepService, StepBarber, StepDateTime, StepExtras, StepCustomer, StepProducts, StepConfirmation]

function toDisplay(s: number) {
  if (s <= 2) return s
  if (s === 3) return 2
  if (s <= 5) return s - 1
  return 4
}
function toLogic(s: number) {
  if (s <= 2) return s
  if (s === 3) return 4
  return 6
}

export default function Booking() {
  const { step, setStep } = useBookingStore()
  const { barbershop } = useTenant()
  const { t } = useTranslation('public')
  const safeStep = Math.min(step, steps.length - 1)
  const StepComponent = steps[safeStep]

  const stepLabels = [
    t('booking.stepLabels.service'),
    t('booking.stepLabels.barber'),
    t('booking.stepLabels.dateTime'),
    t('booking.stepLabels.customer'),
    t('booking.stepLabels.confirmation'),
  ]

  useEffect(() => {
    if (step !== safeStep) setStep(safeStep)
  }, [safeStep, setStep, step])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [safeStep])

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

          {/* Cabeçalho da barbearia */}
          <div className="mb-6 flex items-center gap-3">
            {barbershop?.logoUrl ? (
              <img src={barbershop.logoUrl} alt={barbershop.name} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
                <Scissors size={18} className="text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-900">{barbershop?.name ?? 'Trimio'}</p>
              <p className="text-xs text-zinc-400">{t('booking.title')}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <section className="space-y-5">
              <BookingStepper
                current={toDisplay(safeStep)}
                steps={stepLabels}
                onStepClick={(i) => setStep(toLogic(i))}
              />
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-soft sm:p-6">
                <StepComponent />
              </div>
            </section>

            <aside className="lg:sticky lg:top-6">
              {safeStep > 0 && safeStep < steps.length - 1 && <BookingSummary />}
            </aside>
          </div>

        </div>
      </main>
    </div>
  )
}
