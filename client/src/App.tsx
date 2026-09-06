import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken, getCurrentUser } from './features/auth/services/authApi';

// Public
import HomePage from './features/home/pages/HomePage';

// Auth
import LoginPage    from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

// Layout (role-aware sidebar)
import WorkspaceLayout from './features/dashboard/components/PatientLayout';

// Patient dashboard
import PatientDashboardPage from './features/auth/pages/DashboardPage';

// Blood bank pages
import BloodBankDashboardPage from './features/dashboard/pages/BloodBankDashboardPage';
import InventoryPage          from './features/dashboard/pages/InventoryPage';
import DonationCampsPage      from './features/dashboard/pages/DonationCampsPage';

// Shared dashboard pages
import NotificationsPage from './features/dashboard/pages/NotificationsPage';
import SettingsPage      from './features/dashboard/pages/SettingsPage';

// Profile pages
import ProfileSetupPage from './features/profile/pages/ProfileSetupPage';
import ProfilePage      from './features/profile/pages/ProfilePage';

// Blood request pages
import CreateBloodRequestPage  from './features/blood-request/pages/CreateBloodRequestPage';
import BloodRequestsPage       from './features/blood-request/pages/BloodRequestsPage';
import BloodRequestDetailsPage from './features/blood-request/pages/BloodRequestDetailsPage';

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

// ─── Role-aware dashboard redirect ───────────────────────────────────────────
// /dashboard renders the correct page based on user role
function DashboardRouter() {
  const user = useAuthStore(s => s.user);
  if (!user) return null;
  if (user.role === 'bloodBank') return <BloodBankDashboardPage />;
  // patient, hospital, donor, admin all use the same patient dashboard for now
  return <PatientDashboardPage />;
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

        {/* Profile setup — protected, requires incomplete profile */}
        <Route path="/profile/setup" element={
          <ProtectedRoute requiresIncompleteProfile>
            <ProfileSetupPage />
          </ProtectedRoute>
        } />

        {/* All authenticated pages share the role-aware WorkspaceLayout sidebar */}
        <Route element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard — role-aware */}
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Blood requests (all roles) */}
          <Route path="/blood-requests"     element={<BloodRequestsPage />} />
          <Route path="/blood-requests/new" element={<CreateBloodRequestPage />} />
          <Route path="/blood-requests/:id" element={<BloodRequestDetailsPage />} />

          {/* Blood bank specific */}
          <Route path="/inventory"      element={<InventoryPage />} />
          <Route path="/donation-camps" element={<DonationCampsPage />} />

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
