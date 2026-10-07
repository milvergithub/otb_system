import { lazy, Suspense } from "react"
import { Route, Routes, Navigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { Layout } from "@/components/layout"
import InstallAppDialog from "@/components/InstallAppDialog"
import { PageLoader } from "@/components/ui/page-loader"
import { SetupGate, SETUP_PATH } from "@/components/setup-gate"
const LoginPage = lazy(() => import("@/pages/login"))
const SetupPage = lazy(() => import("@/pages/setup"))
const DashboardPage = lazy(() => import("@/pages/dashboard"))
const MembersPage = lazy(() => import("@/pages/members"))
const MetersPage = lazy(() => import("@/pages/meters"))
const ConsumptionPage = lazy(() => import("@/pages/consumption"))
const BillingPage = lazy(() => import("@/pages/billing"))
const NotificationsPage = lazy(() => import("@/pages/notifications"))
const ReportsPage = lazy(() => import("@/pages/reports"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const RolesPage = lazy(() => import("@/pages/roles"))
const UsersPage = lazy(() => import("@/pages/users"))
const ZonesPage = lazy(() => import("@/pages/zones"))
const AuditLogsPage = lazy(() => import("@/pages/audit"))
const AssetsPage = lazy(() => import("@/pages/assets"))
const FinancesPage = lazy(() => import("@/pages/finances"))
const ActivitiesPage = lazy(() => import("@/pages/activities/activities"))
const AttendancePage = lazy(() => import("@/pages/activities/attendance"))
const ActivityDetailPage = lazy(() => import("@/pages/activities/detail"))
const MemberFinesPage = lazy(() => import("@/pages/activities/member-fines"))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <PageLoader />
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InstallAppDialog />
      <SetupGate>
      <Routes>
      <Route path={SETUP_PATH} element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="meters" element={<MetersPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="bienes" element={<AssetsPage />} />
        <Route path="consumption" element={<ConsumptionPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="finanzas" element={<FinancesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="actividades" element={<ActivitiesPage />} />
        <Route path="actividades/:id" element={<ActivityDetailPage />} />
        <Route path="actividades/:id/asistencia" element={<AttendancePage />} />
        <Route path="fine-types" element={<ActivitiesPage />} />
        <Route path="fines/:memberId" element={<MemberFinesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </SetupGate>
    </Suspense>
  )
}
