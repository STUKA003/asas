import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const [successMessage, setSuccessMessage] = useState('')
  const { t } = useTranslation('admin')
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword({ token, password: data.password }),
    onSuccess: () => {
      setSuccessMessage(t('resetPassword.successMsg'))
      window.setTimeout(() => navigate('/admin/login'), 1200)
    },
  })

  useEffect(() => {
    applyPlatformAccent()
  }, [])

  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-8">
          <AppMark icon={Building2} eyebrow={t('resetPassword.title')} title="Trimio Studio" subtitle={t('resetPassword.subtitle')} tone="admin" compact />
          <h1 className="mt-8 text-3xl font-semibold text-zinc-950">{t('resetPassword.title')}</h1>
          {!token ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              O link de recuperação está incompleto.
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
              <Input label={t('resetPassword.newPasswordLabel')} type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
              <Input label={t('resetPassword.confirmLabel')} type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </div>
              )}
              {mutation.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível atualizar a password.'}
                </div>
              )}
              <Button type="submit" className="w-full" loading={mutation.isPending}>
                {t('resetPassword.submitButton')} <ArrowRight size={16} />
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/admin/login" className="font-medium text-accent-600 hover:underline">{t('forgotPassword.backToLogin')}</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
