import { useEffect, useState } from 'react'
import { BellOff, BellRing, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { barberPortalApi, pushApi } from '@/lib/api'
import { getExistingPushSubscription, pushSupported, subscribeBrowserPush, unsubscribeBrowserPush } from '@/lib/push'
import { cn } from '@/lib/utils'

type PushVariant = 'admin' | 'barber'

type PushConfig = {
  enabled: boolean
  publicKey: string | null
}

export function PushToggle({ variant }: { variant: PushVariant }) {
  const [supported] = useState(() => pushSupported())
  const [config, setConfig] = useState<PushConfig | null>(null)
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const ns = variant === 'admin' ? 'admin' : 'barber'
  const { t } = useTranslation(ns)

  if (!supported) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-ink-muted">
        <ShieldAlert size={14} />
        {t('push.unavailable')}
      </div>
    )
  }

  useEffect(() => {
    if (!supported) return

    let cancelled = false

    async function load() {
      const nextConfig = variant === 'admin'
        ? await pushApi.config()
        : await barberPortalApi.pushConfig()
      const subscription = await getExistingPushSubscription()

      if (cancelled) return
      setConfig(nextConfig)
      setPermission(Notification.permission)
      setActive(Boolean(subscription))
    }

    load().catch(() => {
      if (!cancelled) setConfig({ enabled: false, publicKey: null })
    })

    return () => {
      cancelled = true
    }
  }, [supported, variant])

  async function handleEnable() {
    if (!config?.enabled || !config.publicKey) return

    setLoading(true)
    try {
      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)
      if (nextPermission !== 'granted') return

      const subscription = await subscribeBrowserPush(config.publicKey)
      const payload = subscription.toJSON()

      if (variant === 'admin') {
        await pushApi.subscribe(payload)
      } else {
        await barberPortalApi.pushSubscribe(payload)
      }

      setActive(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    try {
      const endpoint = await unsubscribeBrowserPush()
      if (endpoint) {
        if (variant === 'admin') {
          await pushApi.unsubscribe(endpoint)
        } else {
          await barberPortalApi.pushUnsubscribe(endpoint)
        }
      }
      setActive(false)
    } finally {
      setLoading(false)
    }
  }

  if (config && !config.enabled) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-ink-muted">
        <ShieldAlert size={14} />
        {t('push.notConfigured')}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={loading || permission === 'denied'}
      onClick={active ? handleDisable : handleEnable}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-soft transition',
        active
          ? 'border-success-200 bg-success-50 text-success-700 hover:bg-success-100'
          : 'border-neutral-200 bg-white text-ink-soft hover:border-neutral-300 hover:text-ink',
        permission === 'denied' && 'cursor-not-allowed border-danger-200 bg-danger-50 text-danger-700 opacity-80'
      )}
      title={permission === 'denied' ? t('push.blockedTooltip') : t('push.enableTooltip')}
    >
      {permission === 'denied' ? (
        <>
          <BellOff size={15} />
          {t('push.blocked')}
        </>
      ) : active ? (
        <>
          <BellRing size={15} />
          {t('push.active')}
        </>
      ) : (
        <>
          <BellRing size={15} />
          {t('push.enable')}
        </>
      )}
    </button>
  )
}
