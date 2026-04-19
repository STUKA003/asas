import { useQuery } from '@tanstack/react-query'
import { barberPortalApi } from '@/lib/api'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Calendar, TrendingUp, Clock } from 'lucide-react'
import type { Booking } from '@/lib/types'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function BarberDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey: ['barber-portal', 'bookings', today],
    queryFn: () => barberPortalApi.bookings({ date: today }) as Promise<Booking[]>,
  })

  const { data: stats, isLoading: l2 } = useQuery({
    queryKey: ['barber-portal', 'stats'],
    queryFn: barberPortalApi.stats,
  })

  if (l1 || l2) return <BarberLayout><PageLoader /></BarberLayout>

  const upcoming = bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status))
  const maxCount = Math.max(...(stats?.perDay ?? []).map((d: { count: number }) => d.count), 1)

  return (
    <BarberLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Hoje',
              value: stats?.todayCount ?? 0,
              sub: 'agendamentos',
              icon: Calendar,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              label: 'Receita hoje',
              value: formatCurrency(stats?.todayRevenue ?? 0),
              sub: 'concluídos',
              icon: TrendingUp,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            },
            {
              label: 'Esta semana',
              value: formatCurrency(stats?.weekRevenue ?? 0),
              sub: 'receita',
              icon: TrendingUp,
              color: 'text-violet-500',
              bg: 'bg-violet-50 dark:bg-violet-900/20',
            },
            {
              label: 'Este mês',
              value: formatCurrency(stats?.monthRevenue ?? 0),
              sub: 'receita',
              icon: TrendingUp,
              color: 'text-accent-500',
              bg: 'bg-accent-50 dark:bg-accent-900/20',
            },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                <s.icon size={17} className={s.color} />
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Weekly bar chart */}
        {stats?.perDay && (
          <Card>
            <CardHeader>
              <CardTitle>Esta semana</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end gap-2 h-24">
                {stats.perDay.map((d: { date: string; count: number }, i: number) => {
                  const isToday = d.date === today
                  const height = d.count === 0 ? 4 : Math.max(12, (d.count / maxCount) * 88)
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs text-zinc-400 font-medium">{d.count > 0 ? d.count : ''}</span>
                      <div
                        className={`w-full rounded-lg transition-all ${isToday ? 'bg-accent-500' : 'bg-zinc-150 dark:bg-zinc-700'}`}
                        style={{ height, backgroundColor: isToday ? undefined : '#e4e4e7' }}
                      />
                      <span className={`text-[10px] font-semibold ${isToday ? 'text-accent-500' : 'text-zinc-400'}`}>
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's agenda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Agenda de hoje</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
              <Clock size={12} />
              {format(new Date(), 'HH:mm')}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <div className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Calendar size={18} className="text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-400">Sem agendamentos pendentes para hoje.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcoming.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="w-12 text-center shrink-0">
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        {format(new Date(b.startTime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{b.customer.name}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {b.services.map(s => s.service.name).join(', ')}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 shrink-0 w-16 text-right">
                      {formatCurrency(b.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BarberLayout>
  )
}
