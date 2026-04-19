import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '@/lib/publicApi'
import { applyAccentColor } from '@/lib/theme'
import type { Barbershop } from '@/lib/types'

interface TenantContextValue {
  slug:       string
  barbershop: Barbershop | null
  loading:    boolean
}

const TenantContext = createContext<TenantContextValue>({
  slug: '', barbershop: null, loading: true,
})

export const useTenant = () => useContext(TenantContext)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { slug = '' } = useParams<{ slug: string }>()
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!slug) { setLoading(false); return }

    setLoading(true)
    publicApi(slug)
      .barbershop()
      .then((data) => {
        setBarbershop(data)
        applyAccentColor(data.accentColor ?? 'orange')
      })
      .catch(() => setBarbershop(null))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <TenantContext.Provider value={{ slug, barbershop, loading }}>
      {children}
    </TenantContext.Provider>
  )
}
