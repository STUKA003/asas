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
import { Check, Scissors, X } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="font-bold text-lg">Assinar plano</p>
            <p className="text-sm text-zinc-400">{plan.name} · {formatCurrency(plan.price)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="font-bold text-lg">Plano ativado!</p>
            <p className="text-sm text-zinc-500 mt-1">
              O pedido para <strong>{plan.name}</strong> foi registado.
            </p>
            <Button className="mt-6 w-full" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <form
            className="px-5 py-5 space-y-4"
            onSubmit={e => { e.preventDefault(); mutation.mutate() }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input
                placeholder="O teu nome"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telemóvel</label>
              <Input
                placeholder="+351 900 000 000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao assinar plano.'}
              </p>
            )}
            {!plan.paymentLink && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          {unavailable ? (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 text-center">
              <h1 className="text-3xl font-extrabold">Planos indisponíveis</h1>
              <p className="mt-3 text-zinc-500">Esta barbearia preferiu não mostrar os planos no site público neste momento.</p>
              <Link to={`/${slug}`} className="mt-6 inline-block">
                <Button>Voltar ao início</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <div className="mb-4 flex items-center justify-center gap-3">
                  {barbershop?.logoUrl ? (
                    <img src={barbershop.logoUrl} alt={barbershop.name} className="h-16 w-auto max-w-[10rem] object-contain" />
                  ) : (
                    <div className="tenant-button flex h-14 w-14 items-center justify-center rounded-2xl">
                      <Scissors size={22} className="text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Marca</p>
                    <p className="font-semibold">{barbershop?.name ?? 'Trimio'}</p>
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold">Planos e assinaturas</h1>
                <p className="text-zinc-500 mt-2">Assine e economize em todo atendimento.</p>
              </div>

              {isLoading ? <PageLoader /> : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(plans as Plan[] | undefined)?.map((p, i) => {
                    const highlighted = i === 1
                    const period = p.intervalDays === 30 ? '/mês' : p.intervalDays === 365 ? '/ano' : `/${p.intervalDays}d`
                    const features = [
                      `Dias permitidos: ${formatAllowedDays(p.allowedDays)}`,
                      `Serviços incluídos: ${p.allowedServices.map((s) => s.name).join(', ') || 'Não definido'}`,
                      '1 marcação ativa por vez',
                    ]
                    return (
                      <div
                        key={p.id}
                        className={`relative rounded-2xl p-6 border-2 flex flex-col ${
                          highlighted
                            ? 'tenant-button border-transparent text-white'
                            : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {highlighted && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold px-4 py-1 rounded-full">
                            MAIS POPULAR
                          </div>
                        )}
                        <div className="mb-6">
                          <h3 className="font-bold text-lg">{p.name}</h3>
                          {p.description && (
                            <p className={`text-sm mt-1 ${highlighted ? 'text-white/70' : 'text-zinc-500'}`}>{p.description}</p>
                          )}
                        </div>
                        <div className="flex items-end gap-1 mb-6">
                          <span className="text-4xl font-black">{formatCurrency(p.price)}</span>
                          <span className={`text-sm mb-1 ${highlighted ? 'text-white/70' : 'text-zinc-400'}`}>{period}</span>
                        </div>
                        <ul className="space-y-2.5 flex-1 mb-6">
                          {features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${highlighted ? 'bg-white/20' : 'tenant-soft-icon'}`}>
                                <Check size={11} className={highlighted ? 'text-white' : ''} />
                              </div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {p.paymentLink ? (
                          <Button
                            variant={highlighted ? 'secondary' : 'primary'}
                            className={highlighted ? 'bg-white tenant-ink hover:bg-zinc-100' : ''}
                            onClick={() => window.open(p.paymentLink!, '_blank', 'noopener,noreferrer')}
                          >
                            Assinar agora
                          </Button>
                        ) : (
                          <Button
                            variant={highlighted ? 'secondary' : 'primary'}
                            className={highlighted ? 'bg-white tenant-ink hover:bg-zinc-100' : ''}
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
            </>
          )}
        </section>
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
