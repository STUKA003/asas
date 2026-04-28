import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format, addDays, isSameDay } from 'date-fns'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { cn, toWallClockDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TimeSlot } from '@/lib/types'

const DAYS_VISIBLE = 7

export function StepDateTime() {
  const { slug } = useTenant()
  const { service, barber, date, slot, setDate, setSlot, setStep } = useBookingStore()
  const [offset, setOffset] = useState(0)
  const { t, i18n } = useTranslation(['public', 'common'])

  const today = new Date()
  const days = Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(today, i + offset))
  const selectedDate = date ? new Date(date) : null

  const dateFnsLocale = (() => {
    try { return require(`date-fns/locale/${i18n.language}`).default ?? require('date-fns/locale/pt').default }
    catch { try { return require(`date-fns/locale/${i18n.language.split('-')[0]}`).default } catch { return require('date-fns/locale/pt').default } }
  })()

  const { data, isLoading } = useQuery({
    queryKey: ['public', slug, 'availability', barber?.id, date, service?.duration],
    queryFn:  () => publicApi(slug).availability({
      barberId: barber!.id,
      date:     date!,
      duration: service!.duration,
    }),
    enabled: !!slug && !!barber && !!date && !!service,
  })

  const slots: TimeSlot[] = data?.slots ?? []
  const morningSlots = slots.filter((s) => toWallClockDate(s.startTime).getHours() < 12)
  const afternoonSlots = slots.filter((s) => toWallClockDate(s.startTime).getHours() >= 12)

  const { data: extras } = useQuery({
    queryKey: ['public', slug, 'extras'],
    queryFn:  () => publicApi(slug).extras(),
    enabled:  !!slug,
  })
  const hasExtras = extras === undefined || (Array.isArray(extras) && extras.length > 0)

  const slotGroups = [
    { title: t('booking.steps.dateTime.morning'), items: morningSlots },
    { title: t('booking.steps.dateTime.afternoon'), items: afternoonSlots },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{t('booking.steps.dateTime.title')}</h2>
      </div>

      {/* Date picker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">{t('booking.steps.dateTime.selectDate')}</p>
          <div className="flex gap-1">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - DAYS_VISIBLE))}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setOffset((o) => o + DAYS_VISIBLE)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const isSelected = selectedDate && isSameDay(d, selectedDate)
            return (
              <button
                key={d.toISOString()}
                onClick={() => { setDate(format(d, 'yyyy-MM-dd')); setSlot(null as unknown as TimeSlot) }}
                className={cn(
                  'flex flex-col items-center py-2.5 rounded-xl text-xs font-medium transition-all',
                  isSelected
                    ? 'tenant-button text-white'
                    : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-accent-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <span className={cn('text-[10px] mb-1', isSelected ? 'text-white/70' : 'text-zinc-400')}>
                  {format(d, 'EEE', { locale: dateFnsLocale })}
                </span>
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {date && (
        <div>
          <p className="text-sm font-medium mb-3">{t('booking.steps.dateTime.availableSlots')}</p>
          {isLoading ? <PageLoader /> : slots.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">{t('booking.steps.dateTime.noSlots')}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {slotGroups.map((group) => (
                <div key={group.title} className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{group.title}</p>
                    <span className="text-xs text-zinc-400">
                      {t('booking.steps.dateTime.slotCount', { count: group.items.length })}
                    </span>
                  </div>

                  {group.items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-400">{t('booking.steps.dateTime.noSlotsInPeriod')}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.items.map((s) => {
                        const time = format(toWallClockDate(s.startTime), 'HH:mm')
                        const isSelected = slot?.startTime === s.startTime
                        return (
                          <button
                            key={s.startTime}
                            onClick={() => setSlot(s)}
                            className={cn(
                              'py-2.5 rounded-xl text-sm font-medium transition-all border',
                              isSelected
                                ? 'tenant-button border-transparent text-white'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-accent-300'
                            )}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(1)}>{t('common:btn.back')}</Button>
        <Button disabled={!slot} onClick={() => setStep(hasExtras ? 3 : 4)}>{t('common:btn.next')}</Button>
      </div>
    </div>
  )
}
