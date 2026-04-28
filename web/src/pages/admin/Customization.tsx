import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { barbershopApi } from '@/lib/api'
import { ACCENT_PRESETS, DEFAULT_ACCENT, applyAccentColor } from '@/lib/theme'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Input, Textarea } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { PageLoader } from '@/components/ui/Spinner'
import { ImagePlus, Instagram, Lock, MessageCircle, Scissors, Sparkles, Trash2 } from 'lucide-react'

const MAX_GALLERY_IMAGES = 8
const PLAN_ORDER = { FREE: 0, BASIC: 1, PRO: 2 } as const

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('IMAGE_READ_ERROR'))
    reader.readAsDataURL(file)
  })
}

function removeSolidLogoBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height)
  const { data } = image
  const visited = new Uint8Array(width * height)
  const queue = new Uint32Array(width * height)
  let queueStart = 0
  let queueEnd = 0

  const borderIndexes: number[] = []
  for (let x = 0; x < width; x += 1) {
    borderIndexes.push(x, (height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    borderIndexes.push(y * width, y * width + (width - 1))
  }

  const opaqueSamples = borderIndexes
    .map((index) => {
      const offset = index * 4
      return {
        index,
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        a: data[offset + 3],
      }
    })
    .filter((pixel) => pixel.a > 220)

  if (!opaqueSamples.length) return

  const background = opaqueSamples.reduce(
    (acc, pixel) => ({
      r: acc.r + pixel.r,
      g: acc.g + pixel.g,
      b: acc.b + pixel.b,
    }),
    { r: 0, g: 0, b: 0 },
  )

  background.r /= opaqueSamples.length
  background.g /= opaqueSamples.length
  background.b /= opaqueSamples.length

  const edgeMatchRatio =
    opaqueSamples.filter((pixel) => {
      const diff =
        Math.abs(pixel.r - background.r) +
        Math.abs(pixel.g - background.g) +
        Math.abs(pixel.b - background.b)
      return diff <= 42
    }).length / opaqueSamples.length

  if (edgeMatchRatio < 0.72) return

  const isNearBackground = (index: number) => {
    const offset = index * 4
    const alpha = data[offset + 3]
    if (alpha < 32) return true

    const diff =
      Math.abs(data[offset] - background.r) +
      Math.abs(data[offset + 1] - background.g) +
      Math.abs(data[offset + 2] - background.b)

    return diff <= 54 && alpha > 80
  }

  const enqueue = (index: number) => {
    if (visited[index]) return
    visited[index] = 1
    queue[queueEnd] = index
    queueEnd += 1
  }

  for (const index of borderIndexes) {
    if (isNearBackground(index)) enqueue(index)
  }

  while (queueStart < queueEnd) {
    const index = queue[queueStart]
    queueStart += 1

    const offset = index * 4
    data[offset + 3] = 0

    const x = index % width
    const y = Math.floor(index / width)

    if (x > 0) {
      const next = index - 1
      if (!visited[next] && isNearBackground(next)) enqueue(next)
    }
    if (x < width - 1) {
      const next = index + 1
      if (!visited[next] && isNearBackground(next)) enqueue(next)
    }
    if (y > 0) {
      const next = index - width
      if (!visited[next] && isNearBackground(next)) enqueue(next)
    }
    if (y < height - 1) {
      const next = index + width
      if (!visited[next] && isNearBackground(next)) enqueue(next)
    }
  }

  ctx.putImageData(image, 0, 0)
}

async function compressImage(file: File, usage: 'logo' | 'photo' = 'photo') {
  const source = await readFileAsDataUrl(file)

  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const maxSize = usage === 'logo' ? 700 : 1200
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('IMAGE_PREPARE_ERROR'))
        return
      }

      ctx.drawImage(image, 0, 0, width, height)

      if (usage === 'logo') {
        removeSolidLogoBackground(ctx, width, height)
      }

      const prefersPng = usage === 'logo'
      const result = prefersPng
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', 0.72)

      if (result.length > 1_500_000) {
        reject(new Error('A imagem continua demasiado grande. Tente uma imagem mais pequena.'))
        return
      }

      resolve(result)
    }
    image.onerror = () => reject(new Error('IMAGE_PROCESS_ERROR'))
    image.src = source
  })
}

function getRequestErrorMessage(error: unknown, fallback: string, tooLargeMessage: string) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 413) {
      return tooLargeMessage
    }

    const apiMessage = typeof error.response?.data?.error === 'string' ? error.response.data.error : null
    if (apiMessage) return apiMessage
  }

  return error instanceof Error && !error.message.startsWith('IMAGE_') ? error.message : fallback
}

type FormValues = {
  name: string
  phone: string
  address: string
  whatsapp: string
  instagram: string
  adminAvatarUrl: string
  logoUrl: string
  heroImageUrl: string
  heroTitle: string
  heroSubtitle: string
  heroButtonText: string
  aboutText: string
  galleryImages: string[]
  promoEnabled: boolean
  promoTitle: string
  promoText: string
  promoButtonText: string
  showPlans: boolean
  showProducts: boolean
  planMemberDiscount: number
  slotGranularityMinutes: 5 | 10 | 15 | 20 | 30
}

export default function Customization() {
  const queryClient = useQueryClient()
  const { t } = useTranslation(['admin', 'common'])
  const [activeColorName, setActiveColorName] = useState(DEFAULT_ACCENT.name)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoDirty, setLogoDirty] = useState(false)
  const [adminAvatarError, setAdminAvatarError] = useState<string | null>(null)
  const [adminAvatarDirty, setAdminAvatarDirty] = useState(false)
  const [heroImageError, setHeroImageError] = useState<string | null>(null)
  const [heroImageDirty, setHeroImageDirty] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [galleryDirty, setGalleryDirty] = useState(false)

  const { data: shop, isLoading } = useQuery({
    queryKey: ['barbershop'],
    queryFn: barbershopApi.get,
  })

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      whatsapp: '',
      instagram: '',
      adminAvatarUrl: '',
      logoUrl: '',
      heroImageUrl: '',
      heroTitle: '',
      heroSubtitle: '',
      heroButtonText: '',
      aboutText: '',
      galleryImages: [],
      promoEnabled: false,
      promoTitle: '',
      promoText: '',
      promoButtonText: '',
      showPlans: true,
      showProducts: true,
      planMemberDiscount: 0,
      slotGranularityMinutes: 15,
    },
  })

  const adminAvatarUrl = watch('adminAvatarUrl')
  const logoUrl = watch('logoUrl')
  const heroImageUrl = watch('heroImageUrl')
  const galleryImages = watch('galleryImages')
  const heroTitle = watch('heroTitle')
  const heroSubtitle = watch('heroSubtitle')
  const heroButtonText = watch('heroButtonText')
  const aboutText = watch('aboutText')
  const whatsapp = watch('whatsapp')
  const instagram = watch('instagram')
  const promoEnabled = watch('promoEnabled')
  const promoTitle = watch('promoTitle')
  const promoText = watch('promoText')
  const promoButtonText = watch('promoButtonText')
  const showPlans = watch('showPlans')
  const showProducts = watch('showProducts')
  const slotGranularityMinutes = watch('slotGranularityMinutes')
  const currentPlan = (shop?.subscription?.plan ?? 'FREE') as 'FREE' | 'BASIC' | 'PRO'
  const isPro = PLAN_ORDER[currentPlan] >= PLAN_ORDER.PRO

  useEffect(() => {
    if (shop) {
      reset({
        name: shop.name,
        phone: shop.phone ?? '',
        address: shop.address ?? '',
        whatsapp: shop.whatsapp ?? '',
        instagram: shop.instagram ?? '',
        adminAvatarUrl: shop.currentUser?.avatar ?? '',
        logoUrl: shop.logoUrl ?? '',
        heroImageUrl: shop.heroImageUrl ?? '',
        heroTitle: shop.heroTitle ?? '',
        heroSubtitle: shop.heroSubtitle ?? '',
        heroButtonText: shop.heroButtonText ?? '',
        aboutText: shop.aboutText ?? '',
        galleryImages: shop.galleryImages ?? [],
        promoEnabled: shop.promoEnabled ?? false,
        promoTitle: shop.promoTitle ?? '',
        promoText: shop.promoText ?? '',
        promoButtonText: shop.promoButtonText ?? '',
        showPlans: shop.showPlans ?? true,
        showProducts: shop.showProducts ?? true,
        planMemberDiscount: shop.planMemberDiscount ?? 0,
        slotGranularityMinutes: shop.slotGranularityMinutes ?? 15,
      })
      const savedName = shop.accentColor ?? DEFAULT_ACCENT.name
      setActiveColorName(savedName)
      setAdminAvatarDirty(false)
      setLogoDirty(false)
      setHeroImageDirty(false)
      setGalleryDirty(false)
      applyAccentColor(savedName)
    }
  }, [shop, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: barbershopApi.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barbershop'] }),
  })

  const { mutate: mutateColor, isPending: isSavingColor } = useMutation({
    mutationFn: (colorName: string) => barbershopApi.update({ accentColor: colorName }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barbershop'] }),
  })

  const { mutate: mutateLogo, isPending: isSavingLogo } = useMutation({
    mutationFn: (nextLogoUrl: string) => barbershopApi.update({ logoUrl: nextLogoUrl }),
    onSuccess: () => {
      setLogoDirty(false)
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
    },
  })

  const { mutate: mutateAdminAvatar, isPending: isSavingAdminAvatar } = useMutation({
    mutationFn: (nextAvatarUrl: string) => barbershopApi.update({ adminAvatarUrl: nextAvatarUrl }),
    onSuccess: () => {
      setAdminAvatarDirty(false)
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
    },
  })

  const { mutate: mutateHeroImage, isPending: isSavingHeroImage } = useMutation({
    mutationFn: (nextHeroImageUrl: string) => barbershopApi.update({ heroImageUrl: nextHeroImageUrl }),
    onSuccess: () => {
      setHeroImageDirty(false)
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
    },
  })

  const { mutateAsync: saveGallery, isPending: isSavingGallery } = useMutation({
    mutationFn: (images: string[]) => barbershopApi.update({ galleryImages: images }),
    onSuccess: () => {
      setGalleryDirty(false)
      queryClient.invalidateQueries({ queryKey: ['barbershop'] })
    },
    onError: (error) => {
      const message = getRequestErrorMessage(error, t('customization.errors.saveGallery'), t('customization.errors.imagesTooLargeBatch'))
      setGalleryError(message)
    },
  })

  const handleColorSelect = (preset: typeof ACCENT_PRESETS[number]) => {
    setActiveColorName(preset.name)
    applyAccentColor(preset.name)
    mutateColor(preset.name)
  }

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLogoError(null)
      const dataUrl = await compressImage(file, 'logo')
      setValue('logoUrl', dataUrl, { shouldDirty: true })
      setLogoDirty(true)
    } catch (error) {
      setLogoError(getRequestErrorMessage(error, t('customization.errors.uploadLogo'), t('customization.errors.imagesTooLargeBatch')))
    }

    event.target.value = ''
  }

  const handleAdminAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setAdminAvatarError(null)
      const dataUrl = await compressImage(file, 'photo')
      setValue('adminAvatarUrl', dataUrl, { shouldDirty: true })
      setAdminAvatarDirty(true)
    } catch (error) {
      setAdminAvatarError(getRequestErrorMessage(error, t('customization.errors.uploadAccountPhoto'), t('customization.errors.imagesTooLargeBatch')))
    }

    event.target.value = ''
  }

  const handleHeroImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setHeroImageError(null)
      const dataUrl = await compressImage(file, 'photo')
      setValue('heroImageUrl', dataUrl, { shouldDirty: true })
      setHeroImageDirty(true)
    } catch (error) {
      setHeroImageError(getRequestErrorMessage(error, t('customization.errors.uploadHeroImage'), t('customization.errors.imagesTooLargeBatch')))
    }

    event.target.value = ''
  }

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      setGalleryError(null)
      const currentImages = galleryImages ?? []
      const availableSlots = MAX_GALLERY_IMAGES - currentImages.length

      if (availableSlots <= 0) {
        setGalleryError(`A galeria suporta até ${MAX_GALLERY_IMAGES} imagens.`)
        return
      }

      const nextImages = await Promise.all(files.slice(0, availableSlots).map((file) => compressImage(file, 'photo')))
      const updatedImages = [...currentImages, ...nextImages]
      setValue('galleryImages', updatedImages, { shouldDirty: true })
      setGalleryDirty(true)

      try {
        await saveGallery(updatedImages)
      } catch (saveError) {
        setValue('galleryImages', currentImages, { shouldDirty: false })
        setGalleryDirty(false)
        throw saveError
      }

      if (files.length > availableSlots) {
        setGalleryError(`Só foram adicionadas ${availableSlots} imagens. O limite é ${MAX_GALLERY_IMAGES}.`)
      }
    } catch (error) {
      setGalleryError(getRequestErrorMessage(error, t('customization.errors.uploadGallery'), t('customization.errors.imagesTooLargeBatch')))
    }

    event.target.value = ''
  }

  if (isLoading) return <AdminLayout><PageLoader /></AdminLayout>

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">{t('customization.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('customization.subtitle')}</p>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('customization.baseInfo')}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit(({ adminAvatarUrl: _a, logoUrl: _l, heroImageUrl: _h, galleryImages: _g, ...data }) => mutate(data))} className="space-y-4">
              <Input label={t('customization.fields.shopName')} {...register('name')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      label={t('customization.fields.phone')}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Input label={t('customization.fields.address')} {...register('address')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="whatsapp"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      label="WhatsApp"
                      placeholder="912 345 678"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Input label="Instagram" placeholder={t('admin:customization.instagramPlaceholder')} {...register('instagram')} />
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold">{t('customization.slotInterval.title')}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t('customization.slotInterval.description')}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20, 30].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setValue('slotGranularityMinutes', minutes as FormValues['slotGranularityMinutes'], { shouldDirty: true })}
                      className={`rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all ${
                        slotGranularityMinutes === minutes
                          ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{t('customization.planBenefit.title')}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                    {t('customization.planBenefit.description')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-28">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full h-10 pl-3 pr-8 text-sm rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      {...register('planMemberDiscount', { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">%</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {t('customization.planBenefit.helper')}
                  </p>
                </div>
              </div>
              <input type="hidden" {...register('slotGranularityMinutes', { valueAsNumber: true })} />
              <Button type="submit" loading={isPending}>{t('customization.saveBase')}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('customization.accountPhoto.title')}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                name={shop?.currentUser?.name ?? shop?.name ?? t('customization.accountPhoto.fallbackName')}
                src={adminAvatarUrl || undefined}
                size="lg"
                className="h-20 w-20 text-xl"
              />
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <ImagePlus size={16} />
                  {t('customization.chooseFromComputer')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAdminAvatarChange} />
                </label>
                {adminAvatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setAdminAvatarError(null)
                      setValue('adminAvatarUrl', '', { shouldDirty: true })
                      setAdminAvatarDirty(true)
                    }}
                  >
                    <Trash2 size={14} />
                    {t('customization.accountPhoto.remove')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  loading={isSavingAdminAvatar}
                  disabled={!adminAvatarDirty}
                  onClick={() => mutateAdminAvatar(adminAvatarUrl)}
                >
                  {t('customization.accountPhoto.save')}
                </Button>
                <p className="text-xs text-zinc-400">{t('customization.accountPhoto.description')}</p>
                {adminAvatarError && <p className="text-xs text-red-500">{adminAvatarError}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={t('customization.logo.alt')} className="h-full w-full object-contain" />
                ) : (
                  <Scissors size={28} className="text-accent-600" />
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <ImagePlus size={16} />
                  {t('customization.chooseFromComputer')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setLogoError(null)
                      setValue('logoUrl', '', { shouldDirty: true })
                      setLogoDirty(true)
                    }}
                  >
                    <Trash2 size={14} />
                    {t('customization.logo.remove')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  loading={isSavingLogo}
                  disabled={!logoDirty}
                  onClick={() => mutateLogo(logoUrl)}
                >
                  {t('customization.logo.save')}
                </Button>
                <p className="text-xs text-zinc-400">{t('customization.logo.description')}</p>
                {logoError && <p className="text-xs text-red-500">{logoError}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('customization.advanced.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!isPro ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Lock size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-950">{t('customization.advanced.proOnlyTitle')}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {t('customization.advanced.proOnlyDescription')}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">{t('customization.advanced.heroFeature')}</div>
                      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">{t('customization.advanced.galleryFeature')}</div>
                      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">{t('customization.advanced.promoFeature')}</div>
                      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">{t('customization.advanced.colorFeature')}</div>
                    </div>
                    <Link to="/admin/billing" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                      <Sparkles size={14} />
                      {t('customization.advanced.unlockPro')}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit(({ adminAvatarUrl: _a, logoUrl: _l, heroImageUrl: _h, galleryImages: _g, ...data }) => mutate(data))} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('customization.siteContent.heroTitleLabel')} placeholder={t('customization.siteContent.heroTitlePlaceholder')} {...register('heroTitle')} />
                    <Input label={t('customization.siteContent.heroSubtitleLabel')} placeholder={t('customization.siteContent.heroSubtitlePlaceholder')} {...register('heroSubtitle')} />
                  </div>
                  <Input label={t('customization.siteContent.heroButtonLabel')} placeholder={t('customization.siteContent.heroButtonPlaceholder')} {...register('heroButtonText')} />
                  <Textarea label={t('customization.siteContent.aboutLabel')} rows={4} placeholder={t('customization.siteContent.aboutPlaceholder')} {...register('aboutText')} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3">
                      <input type="checkbox" className="rounded accent-orange-500" {...register('showPlans')} />
                      <div>
                        <p className="text-sm font-medium">{t('customization.siteContent.showPlans')}</p>
                        <p className="text-xs text-zinc-400">{t('customization.siteContent.showPlansDesc')}</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3">
                      <input type="checkbox" className="rounded accent-orange-500" {...register('showProducts')} />
                      <div>
                        <p className="text-sm font-medium">{t('customization.siteContent.showProducts')}</p>
                        <p className="text-xs text-zinc-400">{t('customization.siteContent.showProductsDesc')}</p>
                      </div>
                    </label>
                  </div>
                  <Button type="submit" loading={isPending}>{t('customization.siteContent.save')}</Button>
                </form>

                <div className="border-t border-zinc-200 pt-6">
                  <p className="mb-4 text-sm font-semibold text-zinc-950">{t('customization.heroImage.title')}</p>
                  <div className="space-y-3">
                    <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                      {heroImageUrl ? (
                        <img src={heroImageUrl} alt={t('customization.heroImage.alt')} className="h-full w-full object-cover" />
                      ) : (
                        <Scissors size={28} className="text-zinc-400" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <ImagePlus size={16} />
                        {t('customization.chooseFromComputer')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleHeroImageChange} />
                      </label>
                      {heroImageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setHeroImageError(null)
                            setValue('heroImageUrl', '', { shouldDirty: true })
                            setHeroImageDirty(true)
                          }}
                        >
                          <Trash2 size={14} />
                          {t('customization.heroImage.remove')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        loading={isSavingHeroImage}
                        disabled={!heroImageDirty}
                        onClick={() => mutateHeroImage(heroImageUrl)}
                      >
                        {t('customization.heroImage.save')}
                      </Button>
                    </div>
                    {heroImageError && <p className="text-xs text-red-500">{heroImageError}</p>}
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-6">
                  <p className="mb-4 text-sm font-semibold text-zinc-950">{t('customization.gallery.title')}</p>
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(galleryImages ?? []).map((image, index) => (
                        <div key={`${image.slice(0, 24)}-${index}`} className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                          <img src={image} alt={t('customization.gallery.imageAlt', { index: index + 1 })} className="h-36 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"
                            onClick={async () => {
                              setGalleryError(null)
                              const updatedImages = (galleryImages ?? []).filter((_, itemIndex) => itemIndex !== index)
                              setValue('galleryImages', updatedImages, { shouldDirty: true })
                              setGalleryDirty(true)
                              await saveGallery(updatedImages)
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(galleryImages ?? []).length === 0 && (
                        <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-400">
                          {t('customization.gallery.empty')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <ImagePlus size={16} />
                        {t('customization.gallery.add')}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryChange} />
                      </label>
                      {isSavingGallery && <span className="inline-flex items-center rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">{t('customization.gallery.saving')}</span>}
                    </div>
                    <p className="text-xs text-zinc-400">{t('customization.gallery.helper', { count: MAX_GALLERY_IMAGES })}</p>
                    {galleryError && <p className="text-xs text-red-500">{galleryError}</p>}
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-6">
                  <form onSubmit={handleSubmit(({ adminAvatarUrl: _a, logoUrl: _l, heroImageUrl: _h, galleryImages: _g, ...data }) => mutate(data))} className="space-y-4">
                    <p className="text-sm font-semibold text-zinc-950">{t('customization.promo.title')}</p>
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3">
                      <input type="checkbox" className="rounded accent-orange-500" {...register('promoEnabled')} />
                      <div>
                        <p className="text-sm font-medium">{t('customization.promo.show')}</p>
                        <p className="text-xs text-zinc-400">{t('customization.promo.showDesc')}</p>
                      </div>
                    </label>
                    <Input label={t('customization.promo.titleLabel')} placeholder={t('customization.promo.titlePlaceholder')} {...register('promoTitle')} />
                    <Textarea label={t('customization.promo.textLabel')} rows={3} placeholder={t('customization.promo.textPlaceholder')} {...register('promoText')} />
                    <Input label={t('customization.promo.buttonLabel')} placeholder={t('customization.promo.buttonPlaceholder')} {...register('promoButtonText')} />
                    <Button type="submit" loading={isPending}>{t('customization.promo.save')}</Button>
                  </form>
                </div>

                <div className="border-t border-zinc-200 pt-6">
                  <p className="mb-4 text-sm font-semibold text-zinc-950">{t('customization.accent.title')}</p>
                  <div className="grid grid-cols-5 gap-3">
                    {ACCENT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleColorSelect(preset)}
                        disabled={isSavingColor}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all disabled:opacity-60 ${
                          activeColorName === preset.name ? 'border-zinc-900 dark:border-zinc-100' : 'border-transparent hover:border-zinc-200'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-xl shadow-sm" style={{ backgroundColor: preset.value }} />
                        <span className="text-xs text-zinc-500">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-4">{t('customization.accent.description')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('customization.preview.title')}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              <div className="relative overflow-hidden bg-zinc-950 p-6 text-white">
                {heroImageUrl && <img src={heroImageUrl} alt="Hero" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-zinc-950/75" />
                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt={t('customization.logo.title')} className="h-10 w-10 rounded-xl object-contain" />
                    ) : (
                      <div className="h-10 w-10 bg-accent-500 rounded-xl flex items-center justify-center">
                        <Scissors size={16} className="text-white" />
                      </div>
                    )}
                    <span className="font-bold">{shop?.name ?? 'Trimio'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{heroTitle || t('customization.preview.defaultHeroTitle', { name: shop?.name ?? 'Trimio' })}</h3>
                  <p className="mt-2 max-w-xl text-sm text-zinc-300">{heroSubtitle || t('customization.preview.defaultHeroSubtitle')}</p>
                  {promoEnabled && (promoTitle || promoText) && (
                    <div className="mt-4 max-w-md rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="text-sm font-semibold text-white">{promoTitle || t('customization.preview.defaultPromoTitle')}</p>
                      <p className="mt-1 text-xs text-zinc-300">{promoText || t('customization.preview.defaultPromoText')}</p>
                      <p className="mt-3 text-xs font-medium text-accent-200">{promoButtonText || t('customization.promo.buttonPlaceholder')}</p>
                    </div>
                  )}
                  <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-accent-600 shadow-sm">
                    {heroButtonText || t('customization.siteContent.heroButtonPlaceholder')}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
                    {whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {whatsapp}</span>}
                    {instagram && <span className="inline-flex items-center gap-1"><Instagram size={12} /> {instagram}</span>}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm font-semibold mb-2">{t('customization.preview.aboutTitle')}</p>
                <p className="text-sm text-zinc-500">{aboutText || t('customization.preview.defaultAbout')}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-3 py-1 ${showPlans ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{t('customization.preview.plansVisibility', { state: showPlans ? t('customization.preview.visible') : t('customization.preview.hidden') })}</span>
                  <span className={`rounded-full px-3 py-1 ${showProducts ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{t('customization.preview.productsVisibility', { state: showProducts ? t('customization.preview.visible') : t('customization.preview.hidden') })}</span>
                </div>
                {(galleryImages ?? []).length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(galleryImages ?? []).slice(0, 3).map((image, index) => (
                      <img key={`${image.slice(0, 24)}-${index}`} src={image} alt={t('customization.preview.imageAlt', { index: index + 1 })} className="h-20 w-full rounded-xl object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
