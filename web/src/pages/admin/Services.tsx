import { z } from 'zod'
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
  return (
    <CrudPage<FormData, Service>
      title="Serviços"
      queryKey="services"
      api={servicesApi as unknown as { list: () => Promise<Service[]>; create: (d: FormData) => Promise<Service>; update: (id: string, d: FormData) => Promise<Service>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', price: 0, duration: 30 }}
      getId={(s) => s.id}
      getDefaults={(s) => ({ name: s.name, description: s.description, price: s.price, duration: s.duration, active: s.active })}
      columns={[
        { key: 'name', label: 'Serviço', render: (s) => <span className="font-medium">{s.name}</span> },
        { key: 'price', label: 'Preço', render: (s) => formatCurrency(s.price) },
        { key: 'duration', label: 'Duração', render: (s) => formatDuration(s.duration) },
        { key: 'active', label: 'Status', render: (s) => s.active ? <Badge>Ativo</Badge> : <span className="text-xs text-zinc-400">Inativo</span> },
      ]}
      formFields={(register, errors) => (
        <>
          <Input label="Nome" placeholder="Corte de cabelo" error={errors.name?.message} {...register('name')} />
          <Input label="Descrição (opcional)" placeholder="Descrição do serviço" {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço (€)" type="number" step="0.01" placeholder="18.00" error={errors.price?.message} {...register('price')} />
            <Input label="Duração (min)" type="number" placeholder="30" error={errors.duration?.message} {...register('duration')} />
          </div>
        </>
      )}
    />
  )
}
