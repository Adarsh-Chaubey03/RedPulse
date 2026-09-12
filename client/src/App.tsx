import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken } from './features/auth/services/authApi';

// ── Public (eager) ────────────────────────────────────────────────────────────
// The unauthenticated funnel stays in the entry chunk — these are the pages a
// first-time visitor paints, so an extra network round-trip is not worth it.
import HomePage    from './features/home/pages/HomePage';
import LoginPage   from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

// ── Everything behind auth is route-split ─────────────────────────────────────
// Keeps the workspace pages (and the Google Maps SDK they pull in) out of the
// entry chunk. Each page is fetched on first navigation and cached after that.

// Layout
const WorkspaceLayout = lazy(() => import('./features/dashboard/components/PatientLayout'));

// Profile setup
const ProfileSetupPage = lazy(() => import('./features/profile/pages/ProfileSetupPage'));

// Role dashboards
const PatientDashboardPage   = lazy(() => import('./features/auth/pages/DashboardPage'));
const HospitalDashboardPage  = lazy(() => import('./features/dashboard/pages/HospitalDashboardPage'));
const BloodBankDashboardPage = lazy(() => import('./features/dashboard/pages/BloodBankDashboardPage'));
const DonorDashboardPage     = lazy(() => import('./features/dashboard/pages/DonorDashboardPage'));
const AdminDashboardPage     = lazy(() => import('./features/dashboard/pages/AdminDashboardPage'));

// Shared workspace pages
const NotificationsPage = lazy(() => import('./features/dashboard/pages/NotificationsPage'));
const SettingsPage      = lazy(() => import('./features/dashboard/pages/SettingsPage'));
const ProfilePage       = lazy(() => import('./features/profile/pages/ProfilePage'));

// Blood requests
const BloodRequestsPage       = lazy(() => import('./features/blood-request/pages/BloodRequestsPage'));
const CreateBloodRequestPage  = lazy(() => import('./features/blood-request/pages/CreateBloodRequestPage'));
const BloodRequestDetailsPage = lazy(() => import('./features/blood-request/pages/BloodRequestDetailsPage'));

// Blood bank pages
const InventoryPage     = lazy(() => import('./features/dashboard/pages/InventoryPage'));
const DonationCampsPage = lazy(() => import('./features/dashboard/pages/DonationCampsPage'));

// Hospital pages
const FindDonorsPage = lazy(() => import('./features/dashboard/pages/FindDonorsPage'));

// Admin pages
const AdminUsersPage        = lazy(() => import('./features/dashboard/pages/AdminUsersPage'));
const AdminVerificationPage = lazy(() => import('./features/dashboard/pages/AdminVerificationPage'));
const AdminAnalyticsPage    = lazy(() => import('./features/dashboard/pages/AdminAnalyticsPage'));

// ─── Chunk-loading placeholder ────────────────────────────────────────────────
// Deliberately identical to ProtectedRoute's session-restore state so a route
// chunk arriving late is visually indistinguishable from the existing wait.
function RouteFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#888' }}>
      Loading…
    </div>
  );
}

// Per-route Suspense boundary. Sits *below* the workspace layout's Outlet, so an
// in-app navigation swaps only the content area — the sidebar never unmounts.
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

// ─── Session restore ──────────────────────────────────────────────────────────
function AuthInitializer() {
  const { login, logout, setInitialized, isInitialized } = useAuthStore();
  useEffect(() => {
    if (isInitialized) return;
    const restore = async () => {
      try {
        // /api/auth/refresh returns the same sanitised user payload as
        // /api/auth/me, so one round-trip restores the whole session.
        const { accessToken, user } = await refreshToken();
        login(user, accessToken);
      } catch {
        logout();
      } finally {
        setInitialized();
      }
    };
    restore();
  }, [isInitialized, login, logout, setInitialized]);
  return null;
}

// ─── Role-aware dashboard ─────────────────────────────────────────────────────
function DashboardRouter() {
  const user = useAuthStore(s => s.user);
  if (!user) return null;
  switch (user.role) {
    case 'bloodBank': return <BloodBankDashboardPage />;
    case 'hospital':  return <HospitalDashboardPage />;
    case 'donor':     return <DonorDashboardPage />;
    case 'admin':     return <AdminDashboardPage />;
    default:          return <PatientDashboardPage />;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<HomePage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Profile setup */}
        <Route path="/profile/setup" element={
          <ProtectedRoute requiresIncompleteProfile>
            <Lazy><ProfileSetupPage /></Lazy>
          </ProtectedRoute>
        } />

        {/* All authenticated pages inside the role-aware sidebar layout */}
        <Route element={
          <ProtectedRoute>
            <Lazy><WorkspaceLayout /></Lazy>
          </ProtectedRoute>
        }>
          {/* Dashboard — renders correct page per role */}
          <Route path="/dashboard" element={<Lazy><DashboardRouter /></Lazy>} />

          {/* Blood requests — all roles */}
          <Route path="/blood-requests"     element={<Lazy><BloodRequestsPage /></Lazy>} />
          <Route path="/blood-requests/new" element={<Lazy><CreateBloodRequestPage /></Lazy>} />
          <Route path="/blood-requests/:id" element={<Lazy><BloodRequestDetailsPage /></Lazy>} />

          {/* Blood bank */}
          <Route path="/inventory"      element={<Lazy><InventoryPage /></Lazy>} />
          <Route path="/donation-camps" element={<Lazy><DonationCampsPage /></Lazy>} />

          {/* Hospital */}
          <Route path="/find-donors" element={<Lazy><FindDonorsPage /></Lazy>} />

          {/* Admin */}
          <Route path="/admin/users"        element={<Lazy><AdminUsersPage /></Lazy>} />
          <Route path="/admin/verification" element={<Lazy><AdminVerificationPage /></Lazy>} />
          <Route path="/admin/analytics"    element={<Lazy><AdminAnalyticsPage /></Lazy>} />

          {/* Shared */}
          <Route path="/profile"       element={<Lazy><ProfilePage /></Lazy>} />
          <Route path="/notifications" element={<Lazy><NotificationsPage /></Lazy>} />
          <Route path="/settings"      element={<Lazy><SettingsPage /></Lazy>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
