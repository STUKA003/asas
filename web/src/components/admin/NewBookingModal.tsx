import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { barbersApi, servicesApi, customersApi, bookingsApi, barbershopApi } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { UserCheck, UserPlus } from 'lucide-react'
import type { Barber, Service, Customer, CustomerDetail } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Pre-filled when user clicks a slot in the calendar */
  initialDate?: Date
  initialBarberId?: string
  initialTime?: string
}

export function NewBookingModal({ open, onClose, initialDate, initialBarberId, initialTime }: Props) {
  const qc = useQueryClient()
  const { t, i18n } = useTranslation(['admin', 'common'])

  const [barberId,  setBarberId]  = useState(initialBarberId ?? '')
  const [serviceId, setServiceId] = useState('')
  const [date,      setDate]      = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [time,      setTime]      = useState(initialTime ?? '09:00')
  const [phone,     setPhone]     = useState('')
  const [custName,  setCustName]  = useState('')
  const [notes,     setNotes]     = useState('')
  const [error,     setError]     = useState<string | null>(null)

  /* Sync props when modal reopens */
  useEffect(() => {
    if (open) {
      setBarberId(initialBarberId ?? '')
      setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
      setTime(initialTime ?? '09:00')
      setPhone('')
      setCustName('')
      setNotes('')
      setServiceId('')
      setError(null)
    }
  }, [open, initialBarberId, initialDate, initialTime])

  const { data: barbers = [] }  = useQuery({ queryKey: ['barbers'],   queryFn: () => barbersApi.list()  as Promise<Barber[]>  })
  const { data: services = [] } = useQuery({ queryKey: ['services'],  queryFn: () => servicesApi.list() as Promise<Service[]> })
  const { data: shopData }      = useQuery({ queryKey: ['barbershop'], queryFn: barbershopApi.get })

  /* Customer lookup by phone */
  const trimmedPhone = phone.trim()
  const { data: customerResults = [] } = useQuery({
    queryKey: ['customers', 'lookup', trimmedPhone],
    queryFn:  () => customersApi.list({ q: trimmedPhone }) as Promise<Customer[]>,
    enabled:  trimmedPhone.length >= 6,
  })
  const foundCustomer = customerResults.find(
    (c) => c.phone?.replace(/\s/g, '') === trimmedPhone.replace(/\s/g, '')
  ) ?? null
  const isNewCustomer = trimmedPhone.length >= 6 && !foundCustomer

  /* Fetch full customer detail (with plan services) when found */
  const { data: customerDetail } = useQuery({
    queryKey: ['customers', foundCustomer?.id],
    queryFn:  () => customersApi.get(foundCustomer!.id) as Promise<CustomerDetail>,
    enabled:  !!foundCustomer?.id,
  })

  const selectedService  = services.find((s) => s.id === serviceId) as Service | undefined
  const planServiceIds   = new Set(customerDetail?.plan?.allowedServices?.map((s) => s.id) ?? [])
  const serviceInPlan    = !!selectedService && planServiceIds.has(selectedService.id)
  const discount         = (shopData as { planMemberDiscount?: number } | undefined)?.planMemberDiscount ?? 0
  const effectivePrice   = !selectedService
    ? 0
    : serviceInPlan
      ? 0
      : customerDetail?.plan
        ? selectedService.price * (1 - discount / 100)
        : selectedService.price

  /* Create customer mutation (only if new) */
  const createCustomer = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      customersApi.create(data) as Promise<Customer>,
  })

  /* Create booking mutation */
  const createBooking = useMutation({
    mutationFn: (data: object) => bookingsApi.create(data) as Promise<unknown>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
          : err instanceof Error ? err.message : t('bookings.newBooking.errors.create')
      setError(msg)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!barberId) return setError(t('bookings.newBooking.errors.selectBarber'))
    if (!serviceId) return setError(t('bookings.newBooking.errors.selectService'))
    if (!date) return setError(t('bookings.newBooking.errors.selectDate'))
    if (!time) return setError(t('bookings.newBooking.errors.selectTime'))
    if (!trimmedPhone) return setError(t('bookings.newBooking.errors.customerPhone'))
    if (isNewCustomer && !custName.trim()) return setError(t('bookings.newBooking.errors.customerName'))

    /* Build startTime */
    const [h, m] = time.split(':').map(Number)
    const startTime = new Date(date)
    startTime.setHours(h, m, 0, 0)

    /* Resolve customer */
    let customerId = foundCustomer?.id
    if (!customerId) {
      const created = await createCustomer.mutateAsync({ name: custName.trim(), phone: trimmedPhone })
      customerId = created.id
    }

    createBooking.mutate({
      barberId,
      customerId,
      serviceIds: [serviceId],
      startTime:  startTime.toISOString(),
      ...(notes.trim() && { notes: notes.trim() }),
    })
  }

  const isPending = createCustomer.isPending || createBooking.isPending

  const barberOptions = [
    { value: '', label: t('bookings.newBooking.selectBarber') },
    ...barbers.map((b) => ({ value: b.id, label: b.name })),
  ]
  const serviceOptions = [
    { value: '', label: t('bookings.newBooking.selectService') },
    ...services.map((s) => ({ value: s.id, label: `${s.name} • ${formatCurrency(s.price)} • ${formatDuration(s.duration)}` })),
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('bookings.newBooking.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Barber + Service */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label={t('bookings.newBooking.barberLabel')} options={barberOptions} value={barberId} onChange={(e) => setBarberId(e.target.value)} />
          <Select label={t('bookings.newBooking.serviceLabel')} options={serviceOptions} value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
        </div>

        {/* Date + Time */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('bookings.newBooking.dateLabel')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('bookings.newBooking.timeLabel')}</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>

        {/* Customer */}
        <div className="space-y-2">
          <PhoneInput
            label={t('bookings.newBooking.customerPhoneLabel')}
            placeholder="912 345 678"
            value={phone}
            onChange={setPhone}
          />

          {/* Found customer */}
          {foundCustomer && (
            <div className="px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300 space-y-0.5">
              <div className="flex items-center gap-2">
                <UserCheck size={15} />
                <span>{t('bookings.newBooking.customerFound', { name: foundCustomer.name })}</span>
              </div>
              {customerDetail?.plan && (
                <p className="text-violet-700 dark:text-violet-400 font-medium pl-5">
                  {t('bookings.newBooking.planLabel', { plan: customerDetail.plan.name })}
                  {discount > 0 && <span className="ml-1 text-xs">· {t('bookings.newBooking.discountLabel', { discount })}</span>}
                </p>
              )}
            </div>
          )}

          {/* New customer */}
          {isNewCustomer && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                <UserPlus size={15} />
                <span>{t('bookings.newBooking.newCustomer')}</span>
              </div>
              <Input
                placeholder={t('bookings.newBooking.fullNamePlaceholder')}
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('bookings.newBooking.notesLabel')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t('bookings.newBooking.notesPlaceholder')}
            className="block w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
          />
        </div>

        {/* Summary */}
        {selectedService && date && time && (
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 text-sm space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-medium">{selectedService.name}</p>
              {serviceInPlan && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{t('bookings.newBooking.includedInPlan')}</span>
              )}
            </div>
            <p className="text-zinc-400 text-xs">
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(`${date}T${time}`))} · {formatDuration(selectedService.duration)}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-accent-600 font-semibold">{formatCurrency(effectivePrice)}</p>
              {!serviceInPlan && customerDetail?.plan && effectivePrice < selectedService.price && (
                <p className="text-xs text-zinc-400 line-through">{formatCurrency(selectedService.price)}</p>
              )}
              {serviceInPlan && (
                <p className="text-xs text-zinc-400 line-through">{formatCurrency(selectedService.price)}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>{t('common:btn.cancel')}</Button>
          <Button type="submit" loading={isPending}>{t('bookings.newBooking.createButton')}</Button>
        </div>
      </form>
    </Modal>
  )
}
