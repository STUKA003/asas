import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { servicesApi } from '@/lib/api'
import { CrudPage } from '@/components/admin/CrudPage'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { Service } from '@/lib/types'

const schema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  price:       z.coerce.number().positive(),
  duration:    z.coerce.number().int().positive(),
  active:      z.coerce.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export default function Services() {
  const { t } = useTranslation(['admin', 'common'])

  return (
    <CrudPage<FormData, Service>
      title={t('admin:services.title')}
      queryKey="services"
      api={servicesApi as unknown as { list: () => Promise<Service[]>; create: (d: FormData) => Promise<Service>; update: (id: string, d: FormData) => Promise<Service>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', price: 0, duration: 30 }}
      getId={(s) => s.id}
      getDefaults={(s) => ({ name: s.name, description: s.description, price: s.price, duration: s.duration, active: s.active })}
      columns={[
        { key: 'name', label: t('admin:services.columns.service'), render: (s) => <span className="font-medium">{s.name}</span> },
        { key: 'price', label: t('admin:services.columns.price'), render: (s) => formatCurrency(s.price) },
        { key: 'duration', label: t('admin:services.columns.duration'), render: (s) => formatDuration(s.duration) },
        { key: 'active', label: t('admin:services.columns.status'), render: (s) => s.active ? <Badge>{t('common:status.active')}</Badge> : <span className="text-xs text-zinc-400">{t('common:status.inactive')}</span> },
      ]}
      formFields={(register, errors) => (
        <>
          <Input label={t('admin:services.form.nameLabel')} placeholder={t('admin:services.form.namePlaceholder')} error={errors.name?.message} {...register('name')} />
          <Input label={t('admin:services.form.descLabel')} placeholder={t('admin:services.form.descPlaceholder')} {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('admin:services.form.priceLabel')} type="number" step="0.01" placeholder={t('admin:services.form.pricePlaceholder')} error={errors.price?.message} {...register('price')} />
            <Input label={t('admin:services.form.durationLabel')} type="number" placeholder={t('admin:services.form.durationPlaceholder')} error={errors.duration?.message} {...register('duration')} />
          </div>
        </>
      )}
    />
  )
}
