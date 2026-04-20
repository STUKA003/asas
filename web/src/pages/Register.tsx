import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, Globe, Scissors, Sparkles } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { applyPlatformAccent } from '@/lib/theme'
import { normalizeSlug, slugify } from '@/lib/slug'
const schema = z.object({
  barbershopName: z.string().min(2, 'Nome da barbearia obrigatório'),
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  name: z.string().min(2, 'O teu nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

const FEATURES = [
  'Página pública de agendamentos',
  'Painel de gestão completo',
  'Gestão de barbeiros e horários',
  'Clientes e histórico',
  'Começa grátis, sem cartão',
]

export default function Register() {
  const navigate = useNavigate()
  const [slugManual, setSlugManual] = useState(false)
  const [successState, setSuccessState] = useState<{ email: string; slug: string } | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { barbershopName: '', slug: '', name: '', email: '', password: '' },
  })

  const barbershopName = watch('barbershopName')
  const slug = watch('slug')

  // Auto-generate slug from barbershop name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue('barbershopName', val)
    if (!slugManual) setValue('slug', slugify(val))
  }

  const { mutate, isPending, error: mutationError } = useMutation({
    mutationFn: (data: FormData) => authApi.register(data),
    onSuccess: (data) => {
      setSuccessState({ email: data.email, slug: data.barbershop.slug })
    },
  })

  const apiError =
    mutationError && typeof mutationError === 'object' && 'response' in mutationError
      ? (mutationError as { response?: { data?: { error?: string } } }).response?.data?.error
      : null

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] flex">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="surface-panel w-full max-w-xl rounded-[2rem] border border-white/70 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950">
              <Scissors size={18} className="text-white" />
            </div>
            <span className="font-semibold text-lg text-zinc-950">Trimio</span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Nova barbearia</p>
          <h1 className="mt-3 text-4xl font-semibold text-zinc-950 mb-1">Cria a tua barbearia</h1>
          <p className="text-zinc-500 text-sm mb-8">
            Começa grátis. Sem cartão de crédito.
          </p>

          {successState ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                Enviámos um email de confirmação para <strong>{successState.email}</strong>. Confirma o email antes de entrares no painel.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" className="w-full" onClick={() => navigate('/admin/login')}>
                  Ir para login <ArrowRight size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSuccessState(null)}
                >
                  Criar outra conta
                </Button>
              </div>
            </div>
          ) : <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
            {/* Barbershop name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome da barbearia</label>
              <input
                placeholder="Barbearia do João"
                className="w-full h-12 rounded-[18px] border border-zinc-200/80 bg-white/90 px-4 text-sm shadow-[0_10px_28px_-22px_rgba(15,23,42,0.3)] focus:outline-none focus:ring-4 focus:ring-accent-100 focus:border-accent-500"
                {...register('barbershopName')}
                onChange={handleNameChange}
              />
              {errors.barbershopName && (
                <p className="text-xs text-red-500 mt-1">{errors.barbershopName.message}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Endereço do teu site
              </label>
              <div className="flex items-center overflow-hidden rounded-[18px] border border-zinc-200/80 bg-white/90 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.3)] focus-within:ring-4 focus-within:ring-accent-100 focus-within:border-accent-500">
                <span className="whitespace-nowrap select-none pl-4 pr-1 text-sm text-zinc-400">trimio.app/</span>
                <input
                  className="h-12 flex-1 bg-transparent pr-4 text-sm focus:outline-none"
                  placeholder="minha-barbearia"
                  {...register('slug')}
                    onChange={(e) => {
                      setSlugManual(true)
                      setValue('slug', normalizeSlug(e.target.value))
                    }}
                />
              </div>
              {errors.slug ? (
                <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>
              ) : slug ? (
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                  <Globe size={11} /> trimio.app/{slug}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="O teu nome"
                placeholder="João Silva"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="E-mail"
                type="email"
                placeholder="joao@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <Input
              label="Password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register('password')}
            />

            {apiError && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {apiError === 'Slug already taken' ? 'Este endereço já está em uso. Escolhe outro.' : apiError}
              </div>
            )}

            <Button type="submit" loading={isPending} className="mt-2 w-full text-base">
              Criar barbearia grátis <ArrowRight size={16} />
            </Button>
          </form>}

          <p className="text-center text-sm text-zinc-500 mt-6">
            Já tens conta?{' '}
            <Link to="/admin/login" className="text-accent-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      {/* Right — features panel (hidden on mobile) */}
      <div className="hidden lg:flex w-96 xl:w-[460px] bg-zinc-950 flex-col justify-center px-12 text-white">
        <div className="mb-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={20} className="text-accent-300" />
          </div>
          <div className="text-4xl font-semibold leading-tight mb-3 mt-8">
            O teu negócio online em minutos
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Cria a tua página de agendamentos, gere os teus barbeiros e clientes, tudo num só lugar.
          </p>
        </div>

        <ul className="space-y-3.5 mb-12">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </div>
              {f}
            </li>
          ))}
        </ul>

        <div className="bg-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Plano Grátis incluído</p>
          <p className="text-zinc-300 text-xs leading-relaxed">
            Começas com 1 barbeiro e 30 agendamentos por mês sem pagar nada.
            Quando quiseres crescer, upgrades a partir de 19€/mês.
          </p>
        </div>
      </div>
    </div>
  )
}
