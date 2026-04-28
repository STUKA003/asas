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

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  paymentLink: z.union([z.string().url(), z.literal('')]).optional(),
  intervalDays: z.coerce.number().int().positive(),
  allowedDays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
  allowedServiceIds: z.array(z.string()).min(1),
})
type FormData = z.infer<typeof schema>

function PlanSummaryCards({ plans }: { plans: Plan[] }) {
  const { t } = useTranslation(['admin', 'common'])
  if (!plans.length) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <div key={plan.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</p>
              {plan.description && <p className="text-xs text-zinc-400 mt-0.5">{plan.description}</p>}
            </div>
            {plan.active
              ? <Badge className="shrink-0">{t('common:status.active')}</Badge>
              : <span className="text-xs text-zinc-400 shrink-0">{t('common:status.inactive')}</span>
            }
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {formatCurrency(plan.price)}
            <span className="text-sm font-normal text-zinc-400 ml-1">/{plan.intervalDays}d</span>
          </p>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            {plan.allowedServices?.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Check size={11} className="text-accent-500 shrink-0" />{s.name}
              </div>
            ))}
            {plan.allowedServices?.length > 3 && (
              <p className="text-xs text-zinc-400">+{plan.allowedServices.length - 3}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Plans() {
  const { t } = useTranslation(['admin', 'common'])

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list() as Promise<Service[]>,
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.list() as Promise<Plan[]>,
  })

  const WEEKDAY_OPTIONS = [
    { value: 1, label: t('admin:schedule.days.1') },
    { value: 2, label: t('admin:schedule.days.2') },
    { value: 3, label: t('admin:schedule.days.3') },
    { value: 4, label: t('admin:schedule.days.4') },
    { value: 5, label: t('admin:schedule.days.5') },
    { value: 6, label: t('admin:schedule.days.6') },
    { value: 0, label: t('admin:schedule.days.0') },
  ]

  function formatAllowedDays(days: number[]) {
    const labels = WEEKDAY_OPTIONS.filter((d) => days.includes(d.value)).map((d) => d.label)
    if (labels.length === WEEKDAY_OPTIONS.length) return '—'
    return labels.join(', ')
  }

  return (
    <CrudPage<FormData, Plan>
      title={t('admin:plans.title')}
      queryKey="plans"
      summary={plans.length > 0 ? <PlanSummaryCards plans={plans} /> : undefined}
      api={plansApi as unknown as { list: () => Promise<Plan[]>; create: (d: FormData) => Promise<Plan>; update: (id: string, d: FormData) => Promise<Plan>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', price: 0, paymentLink: '', intervalDays: 30, allowedDays: [1,2,3,4,5,6,0], allowedServiceIds: [] }}
      getId={(p) => p.id}
      getDefaults={(p) => ({
        name: p.name, description: p.description, price: p.price,
        paymentLink: p.paymentLink ?? '', intervalDays: p.intervalDays,
        allowedDays: p.allowedDays,
        allowedServiceIds: p.allowedServices.map((s) => s.id),
      })}
      columns={[
        { key: 'name', label: t('admin:plans.columns.plan'), render: (p) => <span className="font-medium">{p.name}</span> },
        { key: 'price', label: t('admin:plans.columns.price'), render: (p) => <span className="font-semibold text-emerald-600">{formatCurrency(p.price)}</span> },
        { key: 'intervalDays', label: t('admin:schedule.title'), render: (p) => `${p.intervalDays}d` },
        { key: 'allowedDays', label: t('admin:schedule.title'), render: (p) => <span className="text-zinc-500">{formatAllowedDays(p.allowedDays)}</span> },
        { key: 'allowedServices', label: t('admin:layout.nav.services'), render: (p) => <span className="text-zinc-500">{p.allowedServices.map((s) => s.name).join(', ') || '—'}</span> },
        { key: 'active', label: t('admin:plans.columns.status'), render: (p) => p.active ? <Badge>{t('common:status.active')}</Badge> : <span className="text-xs text-zinc-400">{t('common:status.inactive')}</span> },
      ]}
      formFields={(register, errors) => (
        <>
          <Input label={t('admin:services.form.nameLabel')} placeholder={t('admin:plans.placeholder')} error={errors.name?.message} {...register('name')} />
          <Input label={t('admin:services.form.descLabel')} placeholder="" {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('admin:services.form.priceLabel')} type="number" step="0.01" placeholder="24.90" error={errors.price?.message} {...register('price')} />
            <Input label={t('admin:services.form.durationLabel')} type="number" placeholder="30" error={errors.intervalDays?.message} {...register('intervalDays')} />
          </div>
          <Input label="Stripe link" placeholder="https://buy.stripe.com/..." error={errors.paymentLink?.message} {...register('paymentLink')} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('admin:schedule.title')}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input type="checkbox" value={day.value} {...register('allowedDays')} className="accent-accent-500" />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            {errors.allowedDays?.message && <p className="text-xs text-red-500">{errors.allowedDays.message as string}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('admin:layout.nav.services')}</p>
            <div className="space-y-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input type="checkbox" value={service.id} {...register('allowedServiceIds')} className="accent-accent-500" />
                  <span>{service.name}</span>
                </label>
              ))}
            </div>
            {errors.allowedServiceIds?.message && <p className="text-xs text-red-500">{errors.allowedServiceIds.message as string}</p>}
          </div>
        </>
      )}
    />
  )
}
