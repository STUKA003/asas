import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { formatCurrency } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Check, X, Sparkles } from 'lucide-react'
import type { Plan } from '@/lib/types'

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta',  5: 'Sexta',  6: 'Sábado',
}

function formatAllowedDays(days: number[]) {
  const normalized = [...new Set(days)].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
  if (normalized.length === 7) return 'Todos os dias'
  return normalized.map((d) => WEEKDAY_LABELS[d]).join(', ')
}

function SubscribeModal({ plan, slug, onClose }: { plan: Plan; slug: string; onClose: () => void }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone]   = useState(false)

  const mutation = useMutation({
    mutationFn: () => publicApi(slug).subscribePlan({ planId: plan.id, name: name.trim(), phone: phone.trim() }),
    onSuccess: () => setDone(true),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/55 p-4 backdrop-blur-[6px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_24px_56px_rgba(0,0,0,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-ink">Assinar plano</p>
            <p className="text-[12.5px] text-ink-muted">{plan.name} · {formatCurrency(plan.price)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100">
              <Check size={24} className="text-success-600" />
            </div>
            <p className="text-[16px] font-semibold text-ink">Plano ativado!</p>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              O pedido para <strong>{plan.name}</strong> foi registado.
            </p>
            <Button className="mt-6 w-full" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <form
            className="space-y-4 px-5 py-5"
            onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          >
            <Input
              label="Nome"
              placeholder="O teu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <PhoneInput
              label="Telemóvel"
              value={phone}
              onChange={setPhone}
              placeholder="900 000 000"
              required
            />
            {mutation.isError && (
              <p className="rounded-xl border border-danger-200/70 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
                {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao assinar plano.'}
              </p>
            )}
            {!plan.paymentLink && (
              <p className="rounded-xl border border-warning-200/70 bg-warning-50 px-3.5 py-2.5 text-[13px] text-warning-700">
                Este plano só pode ser ativado após confirmação de pagamento ou diretamente pela barbearia.
              </p>
            )}
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Confirmar assinatura
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Plans() {
  const { slug, barbershop } = useTenant()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['public', slug, 'plans'],
    queryFn:  () => publicApi(slug).plans(),
    enabled:  !!slug,
  })

  const unavailable = barbershop?.plan === 'FREE' || barbershop?.showPlans === false

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">

        {unavailable ? (
          <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
            <div className="ui-card p-10">
              <h1 className="text-[1.6rem] font-semibold tracking-tight text-ink">Planos indisponíveis</h1>
              <p className="mt-3 text-[14px] text-ink-muted">
                Esta barbearia preferiu não mostrar os planos no site público neste momento.
              </p>
              <Link to={`/${slug}`} className="mt-6 inline-block">
                <Button>Voltar ao início</Button>
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* ── Page header ──────────────────────────────── */}
            <div className="border-b border-neutral-100 bg-white px-4 py-12 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-5xl text-center">
                <p className="eyebrow mb-3 tenant-ink">Assinaturas</p>
                <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                  Planos e assinaturas
                </h1>
                <p className="mt-2 text-[14px] leading-6 text-ink-muted">
                  Assine um plano e poupe em cada visita — serviços incluídos, sem surpresas.
                </p>
              </div>
            </div>

            {/* ── Plans grid ───────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
              {isLoading ? (
                <PageLoader />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(plans as Plan[] | undefined)?.map((p, i) => {
                    const highlighted = i === 1
                    const period =
                      p.intervalDays === 30  ? '/mês'  :
                      p.intervalDays === 365 ? '/ano'  :
                      `/${p.intervalDays}d`
                    const featuresList = [
                      `Dias: ${formatAllowedDays(p.allowedDays)}`,
                      `Serviços: ${p.allowedServices.map((s) => s.name).join(', ') || 'Não definido'}`,
                      '1 marcação ativa por vez',
                    ]

                    return (
                      <div
                        key={p.id}
                        className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 ${
                          highlighted
                            ? 'bg-[#0d0d11] text-white shadow-[0_12px_32px_rgba(0,0,0,0.2)]'
                            : 'ui-card hover:-translate-y-0.5'
                        }`}
                      >
                        {highlighted && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[10.5px] font-semibold text-white">
                              <Sparkles size={10} /> Mais popular
                            </span>
                          </div>
                        )}

                        {/* Plan name */}
                        <div className="mb-5">
                          <h3 className={`text-[15px] font-semibold ${highlighted ? 'text-white' : 'text-ink'}`}>
                            {p.name}
                          </h3>
                          {p.description && (
                            <p className={`mt-1 text-[13px] leading-5 ${highlighted ? 'text-white/50' : 'text-ink-muted'}`}>
                              {p.description}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mb-6 flex items-end gap-1">
                          <span className={`text-[2.4rem] font-bold tracking-tight leading-none ${highlighted ? 'text-white' : 'text-ink'}`}>
                            {formatCurrency(p.price)}
                          </span>
                          <span className={`mb-1 text-[13px] ${highlighted ? 'text-white/40' : 'text-ink-muted'}`}>
                            {period}
                          </span>
                        </div>

                        {/* Features */}
                        <ul className="mb-6 flex-1 space-y-2.5">
                          {featuresList.map((feature) => (
                            <li key={feature} className={`flex items-start gap-2.5 text-[13px] ${highlighted ? 'text-white/70' : 'text-ink-soft'}`}>
                              <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${highlighted ? 'bg-white/15' : 'tenant-soft-icon'}`}>
                                <Check size={9} className={highlighted ? 'text-white' : ''} />
                              </div>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        {p.paymentLink ? (
                          <Button
                            variant={highlighted ? 'secondary' : 'primary'}
                            className={highlighted ? 'bg-white text-[#0d0d11] hover:bg-neutral-100' : ''}
                            onClick={() => window.open(p.paymentLink!, '_blank', 'noopener,noreferrer')}
                          >
                            Assinar agora
                          </Button>
                        ) : (
                          <Button
                            variant={highlighted ? 'secondary' : 'primary'}
                            className={highlighted ? 'bg-white/10 text-white/60 cursor-not-allowed' : ''}
                            disabled
                          >
                            Pagamento indisponível
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

      </main>
      <Footer />

      {selectedPlan && slug && (
        <SubscribeModal
          plan={selectedPlan}
          slug={slug}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}
