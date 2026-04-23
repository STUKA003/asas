import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PhoneInput } from '@/components/ui/PhoneInput'
import type { CustomerPlanLookup } from '@/lib/types'

const schema = z.object({
  attendeeName: z.string().min(2, 'Nome da pessoa atendida obrigatório'),
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  isForSomeoneElse: z.boolean().default(false),
  name:  z.string().min(2, 'Nome do responsável obrigatório'),
  notes: z.string().optional(),
  phone: z.string().min(10, 'Telefone obrigatório'),
})
type FormData = z.infer<typeof schema>

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terca',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sabado',
}

function formatAllowedDays(days: number[]) {
  const normalized = [...new Set(days)].sort((a, b) => {
    const left = a === 0 ? 7 : a
    const right = b === 0 ? 7 : b
    return left - right
  })

  if (normalized.length === 7) return 'Todos os dias'
  return normalized.map((day) => WEEKDAY_LABELS[day]).join(', ')
}

export function StepCustomer() {
  const { slug, barbershop } = useTenant()
  const { customer, service, date, setCustomer, setCustomerPlan, setStep } = useBookingStore()
  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ?? { attendeeName: '', email: '', isForSomeoneElse: false, name: '', notes: '', phone: '' },
  })
  const phone = watch('phone') ?? ''
  const isForSomeoneElse = watch('isForSomeoneElse') ?? false
  const name = watch('name') ?? ''
  const attendeeName = watch('attendeeName') ?? ''
  const shouldLookupPlan = !isForSomeoneElse && attendeeName.trim().toLowerCase() === name.trim().toLowerCase()
  const { data: customerLookup } = useQuery({
    queryKey: ['public', slug, 'customer-plan', phone, name],
    queryFn: () => publicApi(slug).customerPlan({ phone: phone.trim(), name: name.trim() }),
    enabled: !!slug && shouldLookupPlan && phone.trim().length >= 8 && name.trim().length >= 2,
  })

  const knownCustomer = shouldLookupPlan ? (customerLookup as CustomerPlanLookup | undefined)?.customer : null
  const plan = knownCustomer?.plan ?? null

  // Atualiza o plano no store assim que o lookup resolve — o BookingSummary fica logo correto
  useEffect(() => {
    setCustomerPlan(plan)
  }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isForSomeoneElse && attendeeName !== name) {
      setValue('attendeeName', name, { shouldValidate: true })
    }
  }, [attendeeName, isForSomeoneElse, name, setValue])

  const selectedDay = date ? new Date(date).getDay() : null
  const hasInvalidDay = !!plan && selectedDay !== null && !plan.allowedDays.includes(selectedDay)
  const serviceNotInPlan = !!plan && !!service && !plan.allowedServices.some((item) => item.id === service.id)
  const hasActiveBooking = !!knownCustomer?.activeBooking
  const blockingMessage =
    hasActiveBooking
      ? 'Este cliente ja tem uma marcacao ativa no plano e so pode voltar a marcar depois de concluir o atendimento atual.'
      : hasInvalidDay
        ? `Este plano permite marcacoes apenas em: ${formatAllowedDays(plan!.allowedDays)}.`
        : null

  const { data: extras } = useQuery({
    queryKey: ['public', slug, 'extras'],
    queryFn:  () => publicApi(slug).extras(),
    enabled:  !!slug,
  })
  const { data: products } = useQuery({
    queryKey: ['public', slug, 'products'],
    queryFn:  () => publicApi(slug).products(),
    enabled:  !!slug,
  })
  const hasExtras   = extras   === undefined || (Array.isArray(extras)   && extras.length   > 0)
  const hasProducts = products === undefined || (Array.isArray(products) && products.length > 0)

  const onSubmit = (data: FormData) => {
    if (blockingMessage) return
    setCustomer(data)
    setStep(hasProducts ? 5 : 6)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Os teus dados</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome do responsável"
          placeholder="Joao Silva"
          error={errors.name?.message}
          {...register('name')}
        />
        <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            {...register('isForSomeoneElse')}
          />
          <span>
            <span className="block font-medium">Esta marcação é para outra pessoa</span>
            <span className="block text-ink-muted">Ex.: pai a marcar para o filho ou reserva feita por um responsável.</span>
          </span>
        </label>
        <Input
          label={isForSomeoneElse ? 'Nome da pessoa atendida' : 'Nome de quem vai ser atendido'}
          placeholder="Miguel Silva"
          error={errors.attendeeName?.message}
          {...register('attendeeName')}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label="Telefone / WhatsApp do responsável"
              placeholder="912 345 678"
              error={errors.phone?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Input
          label="E-mail do responsável"
          type="email"
          placeholder="joao@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Textarea
          label="Observações (opcional)"
          placeholder="Alguma preferência ou informação adicional..."
          rows={3}
          {...register('notes')}
        />

        {knownCustomer?.plan && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 space-y-1">
            <p className="font-medium">Plano: {knownCustomer.plan.name}</p>
            <p>Responsável: {knownCustomer.name}</p>
            <p>Dias permitidos: {formatAllowedDays(knownCustomer.plan.allowedDays)}</p>
            <p>Serviços incluídos: {knownCustomer.plan.allowedServices.map((item) => item.name).join(', ')}</p>
            {(barbershop?.planMemberDiscount ?? 0) > 0 && (
              <p className="font-medium text-violet-700 dark:text-violet-400">
                🎁 {barbershop!.planMemberDiscount}% de desconto em extras, produtos e serviços fora do plano.
              </p>
            )}
            {serviceNotInPlan && service && (
              <p className="font-medium text-amber-700 dark:text-amber-400">
                ⚠ "{service.name}" não está no plano — será cobrado{(barbershop?.planMemberDiscount ?? 0) > 0 ? ` com ${barbershop!.planMemberDiscount}% de desconto` : ' ao preço normal'}.
              </p>
            )}
          </div>
        )}

        {blockingMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {blockingMessage}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={() => setStep(hasExtras ? 3 : 2)}>Voltar</Button>
          <Button type="submit" disabled={!!blockingMessage}>Próximo</Button>
        </div>
      </form>
    </div>
  )
}
