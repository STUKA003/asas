import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { getInboxLink } from '@/lib/emailLinks'

type FormData = { slug: string; email: string }

export default function ForgotPassword() {
  const [message, setMessage] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const { t } = useTranslation('admin')
  const schema = z.object({
    slug: z.string().min(1, t('validation.slugRequired')),
    email: z.string().email(t('validation.emailInvalid')),
  })
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data),
    onSuccess: (data, variables) => {
      setMessage(data.message)
      setSubmittedEmail(variables.email)
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
          <AppMark icon={Building2} eyebrow={t('forgotPassword.title')} title="Trimio Studio" subtitle={t('forgotPassword.subtitle')} tone="admin" compact />
          <h1 className="mt-8 text-3xl font-semibold text-zinc-950">{t('forgotPassword.title')}</h1>
          <p className="mt-2 text-sm text-zinc-500">{t('forgotPassword.subtitle')}</p>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
            <Input label={t('login.form.slugLabel')} placeholder={t('login.form.slugPlaceholder')} error={errors.slug?.message} {...register('slug')} />
            <Input label={t('login.form.emailLabel')} type="email" placeholder={t('login.form.emailPlaceholder')} error={errors.email?.message} {...register('email')} />
            {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              {t('forgotPassword.submitButton')} <ArrowRight size={16} />
            </Button>
            {submittedEmail && (
              <a href={getInboxLink(submittedEmail)} target="_blank" rel="noreferrer" className="block">
                <Button type="button" variant="outline" className="w-full">{t('login.form.openInbox')}</Button>
              </a>
            )}
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link to="/admin/login" className="font-medium text-accent-600 hover:underline">{t('forgotPassword.backToLogin')}</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
