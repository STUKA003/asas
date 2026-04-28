import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { extrasApi } from '@/lib/api'
import { CrudPage } from '@/components/admin/CrudPage'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDuration } from '@/lib/utils'
import type { Extra } from '@/lib/types'

const schema = z.object({
  name:           z.string().min(2),
  description:    z.string().optional(),
  price:          z.coerce.number().positive(),
  duration:       z.coerce.number().int().min(0),
  fitsInService:  z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export default function Extras() {
  const { t } = useTranslation(['admin', 'common', 'public'])

  return (
    <CrudPage<FormData, Extra>
      title={t('admin:extras.title')}
      queryKey="extras"
      api={extrasApi as unknown as { list: () => Promise<Extra[]>; create: (d: FormData) => Promise<Extra>; update: (id: string, d: FormData) => Promise<Extra>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', price: 0, duration: 0, fitsInService: false }}
      getId={(e) => e.id}
      getDefaults={(e) => ({ name: e.name, description: e.description, price: e.price, duration: e.duration, fitsInService: e.fitsInService })}
      columns={[
        { key: 'name', label: t('admin:extras.columns.extra'), render: (e) => <span className="font-medium">{e.name}</span> },
        { key: 'price', label: t('admin:extras.columns.price'), render: (e) => formatCurrency(e.price) },
        { key: 'duration', label: t('admin:extras.columns.duration'), render: (e) =>
          e.fitsInService
            ? t('public:booking.steps.extras.includedInService')
            : (e.duration ? `+${formatDuration(e.duration)}` : '—')
        },
      ]}
      formFields={(register, errors, { watch, setValue }) => (
        <>
          <Input label={t('admin:services.form.nameLabel')} placeholder={t('admin:extras.placeholder')} error={errors.name?.message} {...register('name')} />
          <Input label={t('admin:services.form.descLabel')} placeholder="" {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('admin:services.form.priceLabel')} type="number" step="0.01" placeholder="7.50" error={errors.price?.message} {...register('price')} />
            <Input label={t('admin:extras.columns.duration')} type="number" placeholder="0" disabled={watch('fitsInService')} {...register('duration')} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary-600"
              checked={!!watch('fitsInService')}
              onChange={(e) => {
                setValue('fitsInService', e.target.checked)
                if (e.target.checked) setValue('duration', 0)
              }}
            />
            <div>
              <p className="text-sm font-medium text-ink">{t('public:booking.steps.extras.includedInService')}</p>
            </div>
          </label>
        </>
      )}
    />
  )
}
