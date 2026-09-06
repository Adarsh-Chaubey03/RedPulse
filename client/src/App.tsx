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

// Layout
import PatientLayout from './features/dashboard/components/PatientLayout';

// Dashboard pages
import DashboardPage      from './features/auth/pages/DashboardPage';
import NotificationsPage  from './features/dashboard/pages/NotificationsPage';
import SettingsPage       from './features/dashboard/pages/SettingsPage';

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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Profile setup — protected, requires incomplete profile */}
        <Route path="/profile/setup" element={
          <ProtectedRoute requiresIncompleteProfile>
            <ProfileSetupPage />
          </ProtectedRoute>
        } />

        {/* All authenticated pages share the PatientLayout sidebar */}
        <Route element={
          <ProtectedRoute>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/blood-requests"     element={<BloodRequestsPage />} />
          <Route path="/blood-requests/new" element={<CreateBloodRequestPage />} />
          <Route path="/blood-requests/:id" element={<BloodRequestDetailsPage />} />
          <Route path="/profile"            element={<ProfilePage />} />
          <Route path="/notifications"      element={<NotificationsPage />} />
          <Route path="/settings"           element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
