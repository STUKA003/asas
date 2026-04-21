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
  name:  z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
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
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ?? { name: '', phone: '', email: '', notes: '' },
  })
  const phone = watch('phone') ?? ''
  const name = watch('name') ?? ''
  const { data: customerLookup } = useQuery({
    queryKey: ['public', slug, 'customer-plan', phone, name],
    queryFn: () => publicApi(slug).customerPlan({ phone: phone.trim(), name: name.trim() }),
    enabled: !!slug && phone.trim().length >= 8 && name.trim().length >= 2,
  })

  const knownCustomer = (customerLookup as CustomerPlanLookup | undefined)?.customer
  const plan = knownCustomer?.plan ?? null

  // Atualiza o plano no store assim que o lookup resolve — o BookingSummary fica logo correto
  useEffect(() => {
    setCustomerPlan(plan)
  }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <h2 className="text-xl font-bold">Seus dados</h2>
        <p className="text-zinc-500 text-sm mt-1">Para confirmarmos seu agendamento</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome completo"
          placeholder="Joao Silva"
          error={errors.name?.message}
          {...register('name')}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label="Telefone / WhatsApp"
              placeholder="912 345 678"
              error={errors.phone?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Input
          label="E-mail (opcional)"
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
