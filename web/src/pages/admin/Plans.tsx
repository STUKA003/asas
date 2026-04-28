import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { plansApi, servicesApi } from '@/lib/api'
import { CrudPage } from '@/components/admin/CrudPage'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Check } from 'lucide-react'
import type { Plan, Service } from '@/lib/types'

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  paymentLink: z.union([z.string().url('Introduz um link válido'), z.literal('')]).optional(),
  intervalDays: z.coerce.number().int().positive(),
  allowedDays: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Seleciona pelo menos um dia'),
  allowedServiceIds: z.array(z.string()).min(1, 'Seleciona pelo menos um serviço'),
})
type FormData = z.infer<typeof schema>

function formatAllowedDays(days: number[]) {
  const labels = WEEKDAY_OPTIONS.filter((day) => days.includes(day.value)).map((day) => day.label)
  if (labels.length === WEEKDAY_OPTIONS.length) return 'Todos os dias'
  return labels.join(', ')
}

function PlanSummaryCards({ plans }: { plans: Plan[] }) {
  if (!plans.length) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</p>
              {plan.description && (
                <p className="text-xs text-zinc-400 mt-0.5">{plan.description}</p>
              )}
            </div>
            {plan.active
              ? <Badge className="shrink-0">Ativo</Badge>
              : <span className="text-xs text-zinc-400 shrink-0">Inativo</span>
            }
          </div>

          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {formatCurrency(plan.price)}
            <span className="text-sm font-normal text-zinc-400 ml-1">/{plan.intervalDays}d</span>
          </p>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            <p className="text-xs text-zinc-400">{formatAllowedDays(plan.allowedDays)}</p>
            {plan.allowedServices?.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Check size={11} className="text-accent-500 shrink-0" />
                {s.name}
              </div>
            ))}
            {plan.allowedServices?.length > 3 && (
              <p className="text-xs text-zinc-400">+{plan.allowedServices.length - 3} serviços</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Plans() {
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list() as Promise<Service[]>,
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.list() as Promise<Plan[]>,
  })

  return (
    <CrudPage<FormData, Plan>
      title="Planos de subscrição"
      subtitle="Planos que os teus clientes podem subscrever"
      queryKey="plans"
      summary={plans.length > 0 ? <PlanSummaryCards plans={plans} /> : undefined}
      api={plansApi as unknown as { list: () => Promise<Plan[]>; create: (d: FormData) => Promise<Plan>; update: (id: string, d: FormData) => Promise<Plan>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', price: 0, paymentLink: '', intervalDays: 30, allowedDays: [1, 2, 3, 4, 5, 6, 0], allowedServiceIds: [] }}
      getId={(p) => p.id}
      getDefaults={(p) => ({
        name: p.name,
        description: p.description,
        price: p.price,
        paymentLink: p.paymentLink ?? '',
        intervalDays: p.intervalDays,
        allowedDays: p.allowedDays,
        allowedServiceIds: p.allowedServices.map((service) => service.id),
      })}
      columns={[
        { key: 'name', label: 'Plano', render: (p) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span> },
        { key: 'price', label: 'Valor', render: (p) => <span className="font-semibold text-emerald-600">{formatCurrency(p.price)}</span> },
        { key: 'intervalDays', label: 'Período', render: (p) => `${p.intervalDays} dias` },
        { key: 'allowedDays', label: 'Dias', render: (p) => <span className="text-zinc-500">{formatAllowedDays(p.allowedDays)}</span> },
        { key: 'allowedServices', label: 'Serviços', render: (p) => <span className="text-zinc-500">{p.allowedServices.map((service) => service.name).join(', ') || '—'}</span> },
        { key: 'active', label: 'Status', render: (p) => p.active ? <Badge>Ativo</Badge> : <span className="text-xs text-zinc-400">Inativo</span> },
      ]}
      formFields={(register, errors) => (
        <>
          <Input label="Nome" placeholder="Plano Mensal" error={errors.name?.message} {...register('name')} />
          <Input label="Descrição" placeholder="Descrição opcional..." {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço (€)" type="number" step="0.01" placeholder="24.90" error={errors.price?.message} {...register('price')} />
            <Input label="Intervalo (dias)" type="number" placeholder="30" error={errors.intervalDays?.message} {...register('intervalDays')} />
          </div>
          <Input
            label="Link de pagamento Stripe"
            placeholder="https://buy.stripe.com/..."
            error={errors.paymentLink?.message}
            {...register('paymentLink')}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Dias permitidos</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <input type="checkbox" value={day.value} {...register('allowedDays')} className="accent-accent-500" />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            {errors.allowedDays?.message && <p className="text-xs text-red-500">{errors.allowedDays.message}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Serviços permitidos</p>
            <div className="space-y-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <input type="checkbox" value={service.id} {...register('allowedServiceIds')} className="accent-accent-500" />
                  <span>{service.name}</span>
                </label>
              ))}
            </div>
            {errors.allowedServiceIds?.message && <p className="text-xs text-red-500">{errors.allowedServiceIds.message}</p>}
          </div>
        </>
      )}
    />
  )
}
