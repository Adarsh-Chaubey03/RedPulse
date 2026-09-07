import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken, getCurrentUser } from './features/auth/services/authApi';

// ── Public ────────────────────────────────────────────────────────────────────
import HomePage    from './features/home/pages/HomePage';
import LoginPage   from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

// ── Layout ────────────────────────────────────────────────────────────────────
import WorkspaceLayout from './features/dashboard/components/PatientLayout';

// ── Profile setup ─────────────────────────────────────────────────────────────
import ProfileSetupPage from './features/profile/pages/ProfileSetupPage';

// ── Role dashboards ───────────────────────────────────────────────────────────
import PatientDashboardPage   from './features/auth/pages/DashboardPage';
import HospitalDashboardPage  from './features/dashboard/pages/HospitalDashboardPage';
import BloodBankDashboardPage from './features/dashboard/pages/BloodBankDashboardPage';
import DonorDashboardPage     from './features/dashboard/pages/DonorDashboardPage';
import AdminDashboardPage     from './features/dashboard/pages/AdminDashboardPage';

// ── Shared workspace pages ────────────────────────────────────────────────────
import NotificationsPage from './features/dashboard/pages/NotificationsPage';
import SettingsPage      from './features/dashboard/pages/SettingsPage';
import ProfilePage       from './features/profile/pages/ProfilePage';

// ── Blood requests ────────────────────────────────────────────────────────────
import BloodRequestsPage       from './features/blood-request/pages/BloodRequestsPage';
import CreateBloodRequestPage  from './features/blood-request/pages/CreateBloodRequestPage';
import BloodRequestDetailsPage from './features/blood-request/pages/BloodRequestDetailsPage';

// ── Blood bank pages ──────────────────────────────────────────────────────────
import InventoryPage     from './features/dashboard/pages/InventoryPage';
import DonationCampsPage from './features/dashboard/pages/DonationCampsPage';

// ── Hospital pages ────────────────────────────────────────────────────────────
import FindDonorsPage from './features/dashboard/pages/FindDonorsPage';

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminUsersPage        from './features/dashboard/pages/AdminUsersPage';
import AdminVerificationPage from './features/dashboard/pages/AdminVerificationPage';
import AdminAnalyticsPage    from './features/dashboard/pages/AdminAnalyticsPage';

// ─── Session restore ──────────────────────────────────────────────────────────
function AuthInitializer() {
  const { login, logout, setInitialized, isInitialized } = useAuthStore();
  useEffect(() => {
    if (isInitialized) return;
    const restore = async () => {
      try {
        const token = await refreshToken();
        const me    = await getCurrentUser();
        login(me.data, token);
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
            <ProfileSetupPage />
          </ProtectedRoute>
        } />

        {/* All authenticated pages inside the role-aware sidebar layout */}
        <Route element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard — renders correct page per role */}
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Blood requests — all roles */}
          <Route path="/blood-requests"     element={<BloodRequestsPage />} />
          <Route path="/blood-requests/new" element={<CreateBloodRequestPage />} />
          <Route path="/blood-requests/:id" element={<BloodRequestDetailsPage />} />

          {/* Blood bank */}
          <Route path="/inventory"      element={<InventoryPage />} />
          <Route path="/donation-camps" element={<DonationCampsPage />} />

          {/* Hospital */}
          <Route path="/find-donors" element={<FindDonorsPage />} />

          {/* Admin */}
          <Route path="/admin/users"        element={<AdminUsersPage />} />
          <Route path="/admin/verification" element={<AdminVerificationPage />} />
          <Route path="/admin/analytics"    element={<AdminAnalyticsPage />} />

          {/* Shared */}
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings"      element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
