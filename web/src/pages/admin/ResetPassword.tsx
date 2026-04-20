import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Building2 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { AppMark } from '@/components/ui/AppMark'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { applyPlatformAccent } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'

const schema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma a password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As passwords têm de coincidir',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword({ token, password: data.password }),
    onSuccess: () => navigate('/admin/login'),
  })

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-8">
          <AppMark
            icon={Building2}
            eyebrow="Nova password"
            title="Trimio Studio"
            subtitle="Atualizar credenciais admin."
            tone="admin"
            compact
          />
          <h1 className="mt-8 text-3xl font-semibold text-zinc-950">Escolhe a nova password</h1>
          {!token ? (
            <p className="mt-3 text-sm text-red-600">O link de recuperação está incompleto.</p>
          ) : (
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
              <Input label="Nova password" type="password" placeholder="Mínimo 6 caracteres" error={errors.password?.message} {...register('password')} />
              <Input label="Confirmar password" type="password" placeholder="Repete a password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              {mutation.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível atualizar a password.'}
                </div>
              )}
              <Button type="submit" className="w-full" loading={mutation.isPending}>
                Guardar password <ArrowRight size={16} />
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/admin/login" className="font-medium text-accent-600 hover:underline">Voltar ao login</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
