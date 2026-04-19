import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { barbersApi, workingHoursApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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

function isBefore(a: string, b: string) {
  return a.localeCompare(b) < 0
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

  const createMutation = useMutation({
    mutationFn: workingHoursApi.create,
    onSuccess: invalidate,
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => workingHoursApi.update(id, data),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: workingHoursApi.remove,
    onSuccess: invalidate,
  })

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
      dayOfWeek,
      startTime: '09:00',
      endTime: '18:00',
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

  async function applyLunchBreak(dayOfWeek: number) {
    const dayHours = getHoursForDay(dayOfWeek)
    const firstStart = dayHours[0]?.startTime ?? '09:00'
    const lastEnd = dayHours[dayHours.length - 1]?.endTime ?? '18:00'
    const lunchStart = '13:00'
    const lunchEnd = '14:00'

    await Promise.all(dayHours.map((item) => removeMutation.mutateAsync(item.id)))

    if (isBefore(firstStart, lunchStart)) {
      await createMutation.mutateAsync({
        dayOfWeek,
        startTime: firstStart,
        endTime: lunchStart,
        ...(barberId && { barberId }),
      })
    }

    if (isBefore(lunchEnd, lastEnd)) {
      await createMutation.mutateAsync({
        dayOfWeek,
        startTime: lunchEnd,
        endTime: lastEnd,
        ...(barberId && { barberId }),
      })
    }
  }

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
            Configure turnos por dia. Para pausa de almoço, crie dois turnos no mesmo dia, por exemplo 09:00-13:00 e 14:00-18:00.
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

        <Card>
          <CardHeader>
            <CardTitle>Pausas e organização do dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm text-zinc-500">
            <p>Use vários turnos no mesmo dia para bloquear almoço, reuniões ou pausas fixas.</p>
            <p>Exemplo: manhã 09:00-13:00 e tarde 14:00-18:00. O intervalo do meio fica indisponível para marcações.</p>
          </CardContent>
        </Card>

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
                            'relative h-6 w-11 rounded-full transition-colors',
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
                          <p className="text-xs text-zinc-400">
                            {active ? `${dayHours.length} turno${dayHours.length !== 1 ? 's' : ''} configurado${dayHours.length !== 1 ? 's' : ''}` : 'Fechado'}
                          </p>
                        </div>
                      </div>

                      {active ? (
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => applyLunchBreak(dayOfWeek)}>
                            Bloquear almoço
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addInterval(dayOfWeek)}>
                            <Plus size={14} />
                            Adicionar turno
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {active ? (
                      <div className="space-y-3">
                        {dayHours.map((hour, index) => (
                          <div key={hour.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center">
                            <div className="min-w-0 sm:w-24">
                              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                Turno {index + 1}
                              </p>
                            </div>

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
