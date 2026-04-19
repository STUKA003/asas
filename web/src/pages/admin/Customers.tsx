import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Users, UserCheck, Search, X, Download, Upload } from 'lucide-react'
import { customersApi, customersImportApi, plansApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/admin/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import type { Customer, CustomerDetail, Plan } from '@/lib/types'

type ImportRow = { name: string; phone?: string; email?: string; notes?: string }

function detectDelimiter(line: string) {
  const semicolons = (line.match(/;/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

function parseCustomerCsv(text: string): ImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader)

  const nameIndex = headers.findIndex((header) => ['name', 'nome', 'cliente'].includes(header))
  const phoneIndex = headers.findIndex((header) => ['phone', 'telefone', 'telemovel', 'whatsapp'].includes(header))
  const emailIndex = headers.findIndex((header) => ['email', 'e-mail'].includes(header))
  const notesIndex = headers.findIndex((header) => ['notes', 'nota', 'notas', 'observacoes', 'observacao'].includes(header))

  if (nameIndex === -1) {
    throw new Error('O CSV precisa de uma coluna "name" ou "nome".')
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter)
    return {
      name: values[nameIndex] ?? '',
      phone: phoneIndex >= 0 ? values[phoneIndex] ?? '' : '',
      email: emailIndex >= 0 ? values[emailIndex] ?? '' : '',
      notes: notesIndex >= 0 ? values[notesIndex] ?? '' : '',
    }
  }).filter((row) => row.name.trim().length >= 2)
}

function escapeCsvValue(value: string) {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function buildCustomersCsv(rows: Customer[]) {
  const header = ['name', 'phone', 'email', 'plan']
  const lines = rows.map((row) => [
    row.name ?? '',
    row.phone ?? '',
    row.email ?? '',
    row.plan?.name ?? '',
  ].map(escapeCsvValue).join(';'))

  return [header.join(';'), ...lines].join('\n')
}

export default function Customers() {
  const qc = useQueryClient()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [planId, setPlanId] = useState('')
  const [hasPlan, setHasPlan] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['customers', query, planId, hasPlan],
    queryFn: () =>
      customersApi.list({
        ...(query.trim() && { q: query.trim() }),
        ...(planId && { planId }),
        ...(!planId && hasPlan ? { hasPlan } : {}),
      }) as Promise<Customer[]>,
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.list() as Promise<Plan[]>,
  })
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['customers', selectedCustomerId],
    queryFn: () => customersApi.get(selectedCustomerId!) as Promise<CustomerDetail>,
    enabled: !!selectedCustomerId,
  })

  const updatePlanMutation = useMutation({
    mutationFn: (newPlanId: string | null) =>
      customersApi.update(selectedCustomerId!, { planId: newPlanId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditingPlanId(null)
    },
  })

  const updateCustomerMutation = useMutation({
    mutationFn: (payload: { name: string; phone?: string; email?: string; notes?: string }) =>
      customersApi.update(selectedCustomerId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setIsEditingCustomer(false)
      setEditError(null)
    },
    onError: (error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setEditError((error as { response?: { data?: { error?: string } } }).response!.data!.error!)
        return
      }
      setEditError(error instanceof Error ? error.message : 'Não foi possível guardar o cliente.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.remove(selectedCustomerId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setSelectedCustomerId(null)
      setConfirmDelete(false)
    },
  })

  const importMutation = useMutation({
    mutationFn: (rows: ImportRow[]) => customersImportApi.import(rows),
    onSuccess: (result: { created: number; updated: number; skipped: number; total: number }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setImportError(null)
      setImportMessage(`Importação concluída: ${result.created} criados, ${result.updated} atualizados, ${result.skipped} ignorados.`)
    },
    onError: (error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        setImportError((error as { response?: { data?: { error?: string } } }).response!.data!.error!)
        return
      }
      setImportError(error instanceof Error ? error.message : 'Não foi possível importar os clientes.')
    },
  })

  const totalSpent = detail?.bookings
    ?.filter((booking) => booking.status === 'COMPLETED')
    .reduce((sum, booking) => sum + booking.totalPrice, 0) ?? 0

  const planOptions = [
    { value: '', label: 'Todos os planos' },
    ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
  ]
  const planStatusOptions = [
    { value: '', label: 'Com e sem plano' },
    { value: 'true', label: 'Com plano' },
    { value: 'false', label: 'Sem plano' },
  ]

  const withPlanCount = data.filter((c) => !!c.plan).length
  const hasActiveFilters = query || planId || hasPlan

  useEffect(() => {
    if (!detail) return
    setEditForm({
      name: detail.name ?? '',
      phone: detail.phone ?? '',
      email: detail.email ?? '',
      notes: detail.notes ?? '',
    })
    setEditError(null)
  }, [detail])

  const handleExport = () => {
    const csv = buildCustomersCsv(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportMessage(null)
      setImportError(null)
      const text = await file.text()
      const rows = parseCustomerCsv(text)

      if (rows.length === 0) {
        setImportError('O ficheiro não tem linhas válidas para importar.')
        return
      }

      importMutation.mutate(rows)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Não foi possível ler o ficheiro CSV.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {data.length} cliente{data.length !== 1 ? 's' : ''} registado{data.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users size={17} className="text-blue-500" />
              </div>
              <p className="text-xs text-zinc-500 font-medium">Total de clientes</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                <UserCheck size={17} className="text-violet-500" />
              </div>
              <p className="text-xs text-zinc-500 font-medium">Com plano ativo</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{withPlanCount}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar nome, telefone ou e-mail…"
              className="h-10 w-full pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder-zinc-400"
            />
          </div>
          <Select options={planOptions} value={planId} onChange={(e) => setPlanId(e.target.value)} />
          <Select options={planStatusOptions} value={hasPlan} onChange={(e) => setHasPlan(e.target.value)} disabled={!!planId} />
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => { setQuery(''); setPlanId(''); setHasPlan('') }}
            >
              <X size={13} /> Limpar
            </Button>
          )}
          <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={handleExport} disabled={!data.length}>
            <Download size={14} /> Exportar CSV
          </Button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[18px] border border-zinc-200/80 bg-white/80 px-4 text-sm font-semibold text-zinc-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
            <Upload size={14} /> {importMutation.isPending ? 'A importar…' : 'Importar CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          </label>
        </div>

        {(importMessage || importError) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${importError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
            {importError ?? importMessage}
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-500">
          Formato CSV esperado: `name`, `phone`, `email`, `notes`. Se o telefone já existir, o cliente é atualizado; se não existir, é criado.
        </div>

        <Card>
          <CardContent className="pt-0 px-0 pb-0">
            <DataTable<Customer>
              loading={isLoading}
              data={data}
              keyExtractor={(customer) => customer.id}
              onRowClick={(customer) => setSelectedCustomerId(customer.id)}
              emptyMessage="Ainda não existem clientes registados."
              columns={[
                {
                  key: 'name',
                  label: 'Cliente',
                  render: (customer) => (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-accent-700 dark:text-accent-300">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{customer.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'phone',
                  label: 'Telefone',
                  render: (customer) => <span className="text-zinc-500">{customer.phone || '—'}</span>,
                },
                {
                  key: 'email',
                  label: 'E-mail',
                  render: (customer) => <span className="text-zinc-500">{customer.email || '—'}</span>,
                },
                {
                  key: 'plan',
                  label: 'Plano',
                  render: (customer) => customer.plan?.name
                    ? <Badge>{customer.plan.name}</Badge>
                    : <span className="text-zinc-400 text-xs">—</span>,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={!!selectedCustomerId}
        onClose={() => {
          setSelectedCustomerId(null)
          setConfirmDelete(false)
          setEditingPlanId(null)
          setIsEditingCustomer(false)
          setEditError(null)
        }}
        title="Detalhe do cliente"
      >
        {!detail || loadingDetail ? (
          <p className="text-sm text-zinc-500">A carregar...</p>
        ) : (
          <div className="space-y-4">
            {/* Top KPIs */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Cliente</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{detail.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{detail.phone || 'Sem telefone'}</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Total gasto</p>
                <p className="font-bold text-lg text-emerald-600">{formatCurrency(totalSpent)}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{detail.bookings?.filter(b => b.status === 'COMPLETED').length ?? 0} visitas</p>
              </div>
            </div>

            {/* Customer data section */}
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Dados do cliente</p>
                {!isEditingCustomer ? (
                  <Button size="sm" variant="outline" onClick={() => { setIsEditingCustomer(true); setEditError(null) }}>
                    Editar
                  </Button>
                ) : null}
              </div>

              <div className="p-4">
                {isEditingCustomer ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm">
                        <span className="text-zinc-500">Nome</span>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="text-zinc-500">Telefone</span>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value }))}
                          placeholder="Sem telefone"
                          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </label>
                    </div>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-zinc-500">E-mail</span>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((current) => ({ ...current, email: e.target.value }))}
                        placeholder="Sem e-mail"
                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-zinc-500">Notas</span>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm((current) => ({ ...current, notes: e.target.value }))}
                        placeholder="Adicionar nota interna"
                        rows={3}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    {editError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        {editError}
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button size="sm" loading={updateCustomerMutation.isPending} onClick={() => updateCustomerMutation.mutate(editForm)}>
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingCustomer(false)
                          setEditError(null)
                          setEditForm({ name: detail.name ?? '', phone: detail.phone ?? '', email: detail.email ?? '', notes: detail.notes ?? '' })
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-zinc-400 mb-0.5">Nome</p>
                      <p className="font-medium">{detail.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-0.5">Telefone</p>
                      <p className="font-medium">{detail.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-0.5">E-mail</p>
                      <p className="font-medium break-all">{detail.email || '—'}</p>
                    </div>
                    {detail.notes && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">Notas</p>
                        <p className="font-medium">{detail.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Plan section */}
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Plano</p>
              </div>
              <div className="p-4">
                {editingPlanId !== null ? (
                  <div className="flex gap-2">
                    <Select
                      className="flex-1"
                      value={editingPlanId}
                      onChange={e => setEditingPlanId(e.target.value)}
                      options={[
                        { value: '', label: 'Sem plano' },
                        ...(plans as Plan[]).map(p => ({ value: p.id, label: p.name })),
                      ]}
                    />
                    <Button size="sm" loading={updatePlanMutation.isPending} onClick={() => updatePlanMutation.mutate(editingPlanId || null)}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPlanId(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {detail.plan?.name
                        ? <Badge>{detail.plan.name}</Badge>
                        : <span className="text-zinc-400 text-sm">Sem plano</span>
                      }
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setEditingPlanId(detail.plan?.id ?? '')}>
                      Alterar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Booking history */}
            <div>
              <p className="text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Últimos agendamentos</p>
              {!detail.bookings.length ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Sem histórico de agendamentos.</p>
              ) : (
                <div className="space-y-2">
                  {detail.bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {format(new Date(booking.startTime), "dd 'de' MMMM, HH:mm", { locale: pt })}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{formatCurrency(booking.totalPrice)}</p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete zone */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
              {confirmDelete ? (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 space-y-3">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Tens a certeza? Esta ação é irreversível.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}
                    >
                      Apagar cliente
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setConfirmDelete(true)}
                >
                  Apagar cliente
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
