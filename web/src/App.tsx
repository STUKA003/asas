import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { TenantProvider } from '@/providers/TenantProvider'
import { PageLoader } from '@/components/ui/Spinner'
import { PlanGate } from '@/components/admin/PlanGate'
import { useSuperAuthStore } from '@/store/superauth'
import { useBarberAuthStore } from '@/store/barberAuth'

const Home = lazy(() => import('@/pages/Home'))
const PlatformHome = lazy(() => import('@/pages/PlatformHome'))
const Services = lazy(() => import('@/pages/Services'))
const Booking = lazy(() => import('@/pages/Booking'))
const ManageBooking = lazy(() => import('@/pages/ManageBooking'))
const Plans = lazy(() => import('@/pages/Plans'))
const Products = lazy(() => import('@/pages/Products'))
const Login = lazy(() => import('@/pages/admin/Login'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Customers = lazy(() => import('@/pages/admin/Customers'))
const Barbers = lazy(() => import('@/pages/admin/Barbers'))
const AdminServices = lazy(() => import('@/pages/admin/Services'))
const Extras = lazy(() => import('@/pages/admin/Extras'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminPlans = lazy(() => import('@/pages/admin/Plans'))
const Bookings = lazy(() => import('@/pages/admin/Bookings'))
const Schedule = lazy(() => import('@/pages/admin/Schedule'))
const Customization = lazy(() => import('@/pages/admin/Customization'))
const Billing = lazy(() => import('@/pages/admin/Billing'))
const Reports = lazy(() => import('@/pages/admin/Reports'))
const Register = lazy(() => import('@/pages/Register'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/admin/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/admin/ResetPassword'))
const ResendVerification = lazy(() => import('@/pages/admin/ResendVerification'))
const SuperAdminLogin = lazy(() => import('@/pages/superadmin/Login'))
const SuperAdminDashboard = lazy(() => import('@/pages/superadmin/Dashboard'))
const SuperAdminBarbershops = lazy(() => import('@/pages/superadmin/Barbershops'))
const BarberLogin = lazy(() => import('@/pages/barber/Login'))
const BarberDashboard = lazy(() => import('@/pages/barber/Dashboard'))
const BarberSchedule = lazy(() => import('@/pages/barber/Schedule'))

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

function withSuspense(children: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>
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
