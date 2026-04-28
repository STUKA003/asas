import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PhoneInput } from '@/components/ui/PhoneInput'
import type { CustomerPlanLookup } from '@/lib/types'

function formatAllowedDays(days: number[], t: (k: string) => string) {
  const normalized = [...new Set(days)].sort((a, b) => {
    const left = a === 0 ? 7 : a
    const right = b === 0 ? 7 : b
    return left - right
  })
  if (normalized.length === 7) return t('booking.steps.customer.allowedDays').replace('{{days}}', 'all')
  return normalized.map((day) => {
    const dayNames: Record<number, string> = {
      0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday',
    }
    return dayNames[day]
  }).join(', ')
}

export function StepCustomer() {
  const { slug, barbershop } = useTenant()
  const { customer, service, date, setCustomer, setCustomerPlan, setStep } = useBookingStore()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation(['public', 'common'])
  const responsibleToken = searchParams.get('responsibleToken') ?? ''
  const isAddAnother = !!responsibleToken

  const schema = useMemo(() => {
    const base = {
      email: z.string().min(1, t('booking.steps.customer.errors.emailRequired')).email(t('booking.steps.customer.errors.emailInvalid')),
      name:  z.string().min(2, t('booking.steps.customer.errors.nameRequired')),
      notes: z.string().optional(),
      phone: z.string().min(10, t('booking.steps.customer.errors.phoneRequired')),
    }
    if (isAddAnother) {
      return z.object({ ...base, attendeeName: z.string().min(2, t('booking.steps.customer.errors.attendeeRequired')) })
    }
    return z.object(base)
  }, [isAddAnother, t])

  type FormData = z.infer<typeof schema> & { attendeeName?: string }

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? { attendeeName: customer.attendeeName !== customer.name ? customer.attendeeName : '', email: customer.email, name: customer.name, notes: customer.notes, phone: customer.phone }
      : { attendeeName: '', email: '', name: '', notes: '', phone: '' },
  })

  const { data: responsibleBooking } = useQuery({
    queryKey: ['manage', slug, responsibleToken],
    queryFn: () => publicApi(slug).managedBooking({ token: responsibleToken }),
    enabled: !!slug && !!responsibleToken,
  })

  useEffect(() => {
    if (responsibleBooking?.booking?.customer && !customer) {
      const c = responsibleBooking.booking.customer
      reset({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', attendeeName: '', notes: '' })
    }
  }, [responsibleBooking, customer, reset])

  const phone = watch('phone') ?? ''
  const name = watch('name') ?? ''
  const attendeeName = watch('attendeeName') ?? ''
  const shouldLookupPlan = !isAddAnother && phone.trim().length >= 8 && name.trim().length >= 2

  const { data: customerLookup } = useQuery({
    queryKey: ['public', slug, 'customer-plan', phone, name],
    queryFn: () => publicApi(slug).customerPlan({ phone: phone.trim(), name: name.trim() }),
    enabled: !!slug && shouldLookupPlan,
  })

  const knownCustomer = shouldLookupPlan ? (customerLookup as CustomerPlanLookup | undefined)?.customer : null
  const plan = knownCustomer?.plan ?? null

  useEffect(() => { setCustomerPlan(plan) }, [plan]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAddAnother && !attendeeName.trim()) {
      setValue('attendeeName', name, { shouldValidate: false })
    }
  }, [isAddAnother, attendeeName, name, setValue])

  const selectedDay = date ? new Date(date).getDay() : null
  const hasInvalidDay = !!plan && selectedDay !== null && !plan.allowedDays.includes(selectedDay)
  const serviceNotInPlan = !!plan && !!service && !plan.allowedServices.some((item) => item.id === service.id)
  const hasActiveBooking = !!knownCustomer?.activeBooking

  const blockingMessage =
    hasActiveBooking
      ? t('booking.steps.customer.planActiveBlock')
      : hasInvalidDay
        ? t('booking.steps.customer.planDayBlock', { days: formatAllowedDays(plan!.allowedDays, t) })
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
    setCustomer({ ...data, attendeeName: data.attendeeName?.trim() || data.name })
    setStep(hasProducts ? 5 : 6)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t('booking.steps.customer.title')}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('booking.steps.customer.name')}
          placeholder={t('booking.steps.customer.namePlaceholder')}
          error={errors.name?.message}
          disabled={isAddAnother}
          {...register('name')}
        />
        {isAddAnother && (
          <Input
            label={t('booking.steps.customer.attendeeName')}
            placeholder={t('booking.steps.customer.attendeeNamePlaceholder')}
            error={(errors as { attendeeName?: { message?: string } }).attendeeName?.message}
            {...register('attendeeName')}
          />
        )}
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label={t('booking.steps.customer.phone')}
              placeholder={t('booking.steps.customer.phonePlaceholder')}
              error={errors.phone?.message}
              value={field.value}
              onChange={field.onChange}
              disabled={isAddAnother}
            />
          )}
        />
        <Input
          label={t('booking.steps.customer.email')}
          type="email"
          placeholder={t('booking.steps.customer.emailPlaceholder')}
          error={errors.email?.message}
          disabled={isAddAnother}
          {...register('email')}
        />
        <Textarea
          label={t('booking.steps.customer.notes')}
          placeholder=""
          rows={3}
          {...register('notes')}
        />

        {knownCustomer?.plan && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 space-y-1">
            <p className="font-medium">{t('booking.steps.customer.planInfo', { name: knownCustomer.plan.name })}</p>
            <p>{t('booking.steps.customer.responsible', { name: knownCustomer.name })}</p>
            <p>{t('booking.steps.customer.allowedDays', { days: formatAllowedDays(knownCustomer.plan.allowedDays, t) })}</p>
            <p>{t('booking.steps.customer.includedServices', { services: knownCustomer.plan.allowedServices.map((item) => item.name).join(', ') })}</p>
            {(barbershop?.planMemberDiscount ?? 0) > 0 && (
              <p className="font-medium text-violet-700 dark:text-violet-400">
                {t('booking.steps.customer.planDiscount', { discount: barbershop!.planMemberDiscount })}
              </p>
            )}
            {serviceNotInPlan && service && (
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {t('booking.steps.customer.serviceNotInPlan', { service: service.name })}
                {(barbershop?.planMemberDiscount ?? 0) > 0 ? ` — ${t('booking.steps.customer.planDiscount', { discount: barbershop!.planMemberDiscount })}` : ''}
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
          <Button type="button" variant="outline" onClick={() => setStep(hasExtras ? 3 : 2)}>{t('common:btn.back')}</Button>
          <Button type="submit" disabled={!!blockingMessage}>{t('common:btn.next')}</Button>
        </div>
      </form>
    </div>
  )
}
