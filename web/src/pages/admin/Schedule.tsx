import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { barbersApi, workingHoursApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PageLoader } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { Barber } from '@/lib/types'

interface WorkingHour {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
  barberId?: string | null
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const TIMES = Array.from({ length: 31 }, (_, index) => {
  const totalMinutes = (7 * 60) + (index * 30)
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
})

function addHours(time: string, hoursToAdd: number) {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min((22 * 60), (hour * 60) + minute + (hoursToAdd * 60))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildDaySummary(dayHours: WorkingHour[]) {
  if (dayHours.length === 0) return 'Fechado'
  return dayHours.map((h) => `${h.startTime}–${h.endTime}`).join('  ·  ')
}

export default function Schedule() {
  const qc = useQueryClient()
  const [barberId, setBarberId] = useState('')

  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.list() as Promise<Barber[]>,
  })
  const { data: hours = [], isLoading } = useQuery({
    queryKey: ['working-hours', barberId],
    queryFn: () => workingHoursApi.list({ ...(barberId && { barberId }) }) as Promise<WorkingHour[]>,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['working-hours'] })

  const createMutation = useMutation({ mutationFn: workingHoursApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => workingHoursApi.update(id, data),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({ mutationFn: workingHoursApi.remove, onSuccess: invalidate })

  const getHoursForDay = (dayOfWeek: number) =>
    hours
      .filter((item) => item.dayOfWeek === dayOfWeek && (item.barberId ?? '') === barberId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const toggleDay = (dayOfWeek: number) => {
    const dayHours = getHoursForDay(dayOfWeek)
    if (dayHours.length > 0) {
      dayHours.forEach((item) => removeMutation.mutate(item.id))
      return
    }
    createMutation.mutate({
      dayOfWeek, startTime: '09:00', endTime: '18:00',
      ...(barberId && { barberId }),
    })
  }

  const addInterval = (dayOfWeek: number) => {
    const dayHours = getHoursForDay(dayOfWeek)
    const lastInterval = dayHours[dayHours.length - 1]
    const startTime = lastInterval ? addHours(lastInterval.endTime, 1) : '09:00'
    const endTime = addHours(startTime, 4)
    createMutation.mutate({
      dayOfWeek,
      startTime,
      endTime: startTime === endTime ? '22:00' : endTime,
      ...(barberId && { barberId }),
    })
  }

  const updateTime = (id: string, field: 'startTime' | 'endTime', value: string) => {
    updateMutation.mutate({ id, data: { [field]: value } })
  }

  // Barbers that have their own specific hours (override shop-wide)
  const barbersWithOwnHours = useMemo(() => {
    if (barberId !== '') return []
    const barberIdsWithHours = new Set(
      hours.filter((h) => h.barberId != null).map((h) => h.barberId as string)
    )
    return barbers.filter((b) => barberIdsWithHours.has(b.id))
  }, [barberId, hours, barbers])

  const barberOptions = [
    { value: '', label: 'Barbearia (padrão)' },
    ...barbers.map((barber) => ({ value: barber.id, label: barber.name })),
  ]

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Horários de funcionamento</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configure os dias e horários de abertura diretamente em cada dia.
          </p>
        </div>

        <div className="max-w-xs">
          <Select
            label="Configurar horários para"
            options={barberOptions}
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          />
        </div>

        {barbersWithOwnHours.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">Barbeiros com horário próprio (ignoram o padrão)</p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Seleciona o barbeiro no selector acima para editar o horário dele. Ou clica em "Herdar padrão" para remover o horário próprio e usar o da barbearia.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
              {barbersWithOwnHours.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBarberId(b.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors dark:bg-zinc-900 dark:text-amber-300 dark:border-amber-700"
                >
                  {b.name} → editar
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? <PageLoader /> : (
          <div className="space-y-3">
            {DAYS.map((dayLabel, dayOfWeek) => {
              const dayHours = getHoursForDay(dayOfWeek)
              const active = dayHours.length > 0

              return (
                <Card key={dayOfWeek}>
                  <CardContent className="space-y-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleDay(dayOfWeek)}
                          className={cn(
                            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                            active ? 'bg-accent-500' : 'bg-zinc-200 dark:bg-zinc-700'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                              active && 'translate-x-5'
                            )}
                          />
                        </button>
                        <div>
                          <p className={cn('text-sm font-medium', !active && 'text-zinc-400')}>{dayLabel}</p>
                          <p className={cn('text-xs', active ? 'text-zinc-500' : 'text-zinc-400')}>
                            {buildDaySummary(dayHours)}
                          </p>
                        </div>
                      </div>

                      {active ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => addInterval(dayOfWeek)}
                          >
                            <Plus size={13} />
                            Novo período
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {active ? (
                      <div className="space-y-2">
                        {dayHours.map((hour, index) => (
                          <div
                            key={hour.id}
                            className="flex flex-col gap-3 rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center"
                          >
                            {dayHours.length > 1 && (
                              <p className="text-xs font-medium text-zinc-400 sm:w-20 shrink-0">
                                {index === 0 ? 'Manhã' : index === 1 ? 'Tarde' : `Período ${index + 1}`}
                              </p>
                            )}

                            <div className="flex items-center gap-3">
                              <Select
                                options={TIMES.map((time) => ({ value: time, label: time }))}
                                value={hour.startTime}
                                onChange={(e) => updateTime(hour.id, 'startTime', e.target.value)}
                                className="w-28"
                              />
                              <span className="text-sm text-zinc-400">até</span>
                              <Select
                                options={TIMES.map((time) => ({ value: time, label: time }))}
                                value={hour.endTime}
                                onChange={(e) => updateTime(hour.id, 'endTime', e.target.value)}
                                className="w-28"
                              />
                            </div>

                            <div className="sm:ml-auto">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-red-500 hover:text-red-600"
                                onClick={() => removeMutation.mutate(hour.id)}
                              >
                                <Trash2 size={14} />
                                Remover
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
