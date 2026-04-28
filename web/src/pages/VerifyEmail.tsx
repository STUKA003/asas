import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Building2, MailCheck, RotateCw } from 'lucide-react'
import { authApi } from '@/lib/api'
import { AppMark } from '@/components/ui/AppMark'
import { Button } from '@/components/ui/Button'
import { useInstallBrand } from '@/lib/installBrand'
import { applyPlatformAccent } from '@/lib/theme'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { t } = useTranslation('platform')

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
  })

  useEffect(() => {
    applyPlatformAccent()
    if (token) mutation.mutate()
  }, [token])

  useInstallBrand('admin')

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfcfb_0%,#f3f4f7_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <section className="surface-panel w-full rounded-[2rem] border border-white/70 p-8">
          <AppMark icon={Building2} eyebrow={t('verifyEmail.eyebrow')} title={t('verifyEmail.brand')} subtitle={t('verifyEmail.subtitle')} tone="admin" compact />
          <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <MailCheck size={24} />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-zinc-950">{t('verifyEmail.title')}</h1>
          {!token ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {t('verifyEmail.missingToken')}
            </div>
          ) : mutation.isPending ? (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-4 text-sm text-zinc-600">
              {t('verifyEmail.loading')}
            </div>
          ) : mutation.isSuccess ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              {t('verifyEmail.success')}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('verifyEmail.error')}
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {token && mutation.isError && (
              <Button type="button" variant="outline" className="w-full" onClick={() => mutation.mutate()}>
                {t('verifyEmail.retry')} <RotateCw size={16} />
              </Button>
            )}
            {(!token || mutation.isError) && (
              <Link to="/admin/resend-verification" className="block">
                <Button type="button" variant="outline" className="w-full">{t('verifyEmail.resendEmail')}</Button>
              </Link>
            )}
            <Link to="/admin/login" className="block">
              <Button type="button" className="w-full">{t('verifyEmail.goToLogin')} <ArrowRight size={16} /></Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
