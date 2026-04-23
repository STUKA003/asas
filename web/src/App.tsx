import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { TenantProvider } from '@/providers/TenantProvider'
import { PageLoader } from '@/components/ui/Spinner'
import { PlanGate } from '@/components/admin/PlanGate'
import { useSuperAuthStore } from '@/store/superauth'
import { useBarberAuthStore } from '@/store/barberAuth'

const LAZY_RETRY_KEY = 'trimio:lazy-route-retry'

function isChunkLoadError(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('failed to load module script') ||
    message.includes('chunk')
  )
}

function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>
) {
  return lazy(async () => {
    try {
      const module = await importer()
      sessionStorage.removeItem(LAZY_RETRY_KEY)
      return module
    } catch (error) {
      if (isChunkLoadError(error) && sessionStorage.getItem(LAZY_RETRY_KEY) !== '1') {
        sessionStorage.setItem(LAZY_RETRY_KEY, '1')
        window.location.reload()
      }

      throw error
    }
  })
}

const Home = lazyWithRetry(() => import('@/pages/Home'))
const PlatformHome = lazyWithRetry(() => import('@/pages/PlatformHome'))
const Services = lazyWithRetry(() => import('@/pages/Services'))
const Booking = lazyWithRetry(() => import('@/pages/Booking'))
const MyBookings = lazyWithRetry(() => import('@/pages/MyBookings'))
const ManageBooking = lazyWithRetry(() => import('@/pages/ManageBooking'))
const Plans = lazyWithRetry(() => import('@/pages/Plans'))
const Products = lazyWithRetry(() => import('@/pages/Products'))
const Login = lazyWithRetry(() => import('@/pages/admin/Login'))
const Dashboard = lazyWithRetry(() => import('@/pages/admin/Dashboard'))
const Customers = lazyWithRetry(() => import('@/pages/admin/Customers'))
const Barbers = lazyWithRetry(() => import('@/pages/admin/Barbers'))
const AdminServices = lazyWithRetry(() => import('@/pages/admin/Services'))
const Extras = lazyWithRetry(() => import('@/pages/admin/Extras'))
const AdminProducts = lazyWithRetry(() => import('@/pages/admin/Products'))
const AdminPlans = lazyWithRetry(() => import('@/pages/admin/Plans'))
const Bookings = lazyWithRetry(() => import('@/pages/admin/Bookings'))
const Schedule = lazyWithRetry(() => import('@/pages/admin/Schedule'))
const Customization = lazyWithRetry(() => import('@/pages/admin/Customization'))
const Billing = lazyWithRetry(() => import('@/pages/admin/Billing'))
const Reports = lazyWithRetry(() => import('@/pages/admin/Reports'))
const Register = lazyWithRetry(() => import('@/pages/Register'))
const VerifyEmail = lazyWithRetry(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazyWithRetry(() => import('@/pages/admin/ForgotPassword'))
const ResetPassword = lazyWithRetry(() => import('@/pages/admin/ResetPassword'))
const ResendVerification = lazyWithRetry(() => import('@/pages/admin/ResendVerification'))
const SuperAdminLogin = lazyWithRetry(() => import('@/pages/superadmin/Login'))
const SuperAdminDashboard = lazyWithRetry(() => import('@/pages/superadmin/Dashboard'))
const SuperAdminBarbershops = lazyWithRetry(() => import('@/pages/superadmin/Barbershops'))
const BarberLogin = lazyWithRetry(() => import('@/pages/barber/Login'))
const BarberDashboard = lazyWithRetry(() => import('@/pages/barber/Dashboard'))
const BarberSchedule = lazyWithRetry(() => import('@/pages/barber/Schedule'))

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />
}

function RequireSuperAuth({ children }: { children: ReactNode }) {
  const { token } = useSuperAuthStore()
  return token ? <>{children}</> : <Navigate to="/superadmin/login" replace />
}

function RequireBarberAuth({ children, slug }: { children: ReactNode; slug: string }) {
  const { token } = useBarberAuthStore()
  return token ? <>{children}</> : <Navigate to={`/${slug}/barber/login`} replace />
}

function BarberPortalGuard({ children }: { children: ReactNode }) {
  const { slug = '' } = useParams<{ slug: string }>()
  return <RequireBarberAuth slug={slug}>{children}</RequireBarberAuth>
}

/** Wraps all public /:slug/* routes with tenant context */
function TenantLayout() {
  return (
    <TenantProvider>
      <Outlet />
    </TenantProvider>
  )
}

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <PageLoader />
    </div>
  )
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Route render failed', error)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center px-6">
          <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-zinc-950">Falha ao abrir a página</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Ocorreu um erro no carregamento. Atualiza a página para voltar a sincronizar a app.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Atualizar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function withSuspense(children: ReactNode) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteLoader />}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={withSuspense(<PlatformHome />)} />

          {/* Admin — no tenant context needed */}
          <Route path="/admin/login" element={withSuspense(<Login />)} />
          <Route path="/register" element={withSuspense(<Register />)} />
          <Route path="/verify-email" element={withSuspense(<VerifyEmail />)} />
          <Route path="/admin/forgot-password" element={withSuspense(<ForgotPassword />)} />
          <Route path="/admin/reset-password" element={withSuspense(<ResetPassword />)} />
          <Route path="/admin/resend-verification" element={withSuspense(<ResendVerification />)} />
          <Route path="/admin" element={withSuspense(<RequireAuth><Dashboard /></RequireAuth>)} />
          <Route path="/admin/customers" element={withSuspense(<RequireAuth><Customers /></RequireAuth>)} />
          <Route path="/admin/barbers" element={withSuspense(<RequireAuth><Barbers /></RequireAuth>)} />
          <Route path="/admin/services" element={withSuspense(<RequireAuth><AdminServices /></RequireAuth>)} />
          <Route path="/admin/extras" element={withSuspense(<RequireAuth><PlanGate require="BASIC"><Extras /></PlanGate></RequireAuth>)} />
          <Route path="/admin/products" element={withSuspense(<RequireAuth><PlanGate require="BASIC"><AdminProducts /></PlanGate></RequireAuth>)} />
          <Route path="/admin/plans" element={withSuspense(<RequireAuth><PlanGate require="BASIC"><AdminPlans /></PlanGate></RequireAuth>)} />
          <Route path="/admin/bookings" element={withSuspense(<RequireAuth><Bookings /></RequireAuth>)} />
          <Route path="/admin/schedule" element={withSuspense(<RequireAuth><Schedule /></RequireAuth>)} />
          <Route path="/admin/customization" element={withSuspense(<RequireAuth><Customization /></RequireAuth>)} />
          <Route path="/admin/billing" element={withSuspense(<RequireAuth><Billing /></RequireAuth>)} />
          <Route path="/admin/reports" element={withSuspense(<RequireAuth><PlanGate require="BASIC"><Reports /></PlanGate></RequireAuth>)} />

          {/* Barber portal */}
          <Route path="/barber/login" element={withSuspense(<BarberLogin />)} />
          <Route path="/:slug/barber/login" element={withSuspense(<BarberLogin />)} />
          <Route path="/:slug/barber" element={
            withSuspense(<BarberPortalGuard><BarberDashboard /></BarberPortalGuard>)
          } />
          <Route path="/:slug/barber/schedule" element={
            withSuspense(<BarberPortalGuard><BarberSchedule /></BarberPortalGuard>)
          } />

          {/* Public — all scoped to /:slug, tenant resolved from URL */}
          <Route path="/:slug" element={<TenantLayout />}>
            <Route index element={withSuspense(<Home />)} />
            <Route path="services" element={withSuspense(<Services />)} />
            <Route path="booking" element={withSuspense(<Booking />)} />
            <Route path="my-bookings" element={withSuspense(<MyBookings />)} />
            <Route path="booking/manage" element={withSuspense(<ManageBooking />)} />
            <Route path="plans" element={withSuspense(<Plans />)} />
            <Route path="products" element={withSuspense(<Products />)} />
          </Route>

          {/* Super Admin */}
          <Route path="/superadmin/login" element={withSuspense(<SuperAdminLogin />)} />
          <Route path="/superadmin" element={withSuspense(<RequireSuperAuth><SuperAdminDashboard /></RequireSuperAuth>)} />
          <Route path="/superadmin/barbershops" element={withSuspense(<RequireSuperAuth><SuperAdminBarbershops /></RequireSuperAuth>)} />

          {/* Unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
