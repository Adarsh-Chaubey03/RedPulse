import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken, getCurrentUser } from './features/auth/services/authApi';

// Home page
import HomePage from './features/home/pages/HomePage';

// Auth pages
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import DashboardPage from './features/auth/pages/DashboardPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';

// Profile pages
import ProfileSetupPage from './features/profile/pages/ProfileSetupPage';
import ProfilePage from './features/profile/pages/ProfilePage';

// Blood request pages
import CreateBloodRequestPage from './features/blood-request/pages/CreateBloodRequestPage';
import BloodRequestsPage from './features/blood-request/pages/BloodRequestsPage';
import BloodRequestDetailsPage from './features/blood-request/pages/BloodRequestDetailsPage';

// ─── Session restore on startup ───────────────────────────────────────────────

function AuthInitializer() {
  const { login, logout, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) return;

    const restore = async () => {
      try {
        const newToken = await refreshToken();
        const meResponse = await getCurrentUser();
        login(meResponse.data, newToken);
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

// ─── Authenticated root redirect ──────────────────────────────────────────────
// Only used when an authenticated user navigates to /dashboard shortcut etc.

function AuthenticatedRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isProfileComplete) return <Navigate to="/profile/setup" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Shortcut: /app redirects authenticated users to dashboard */}
        <Route path="/app" element={<AuthenticatedRedirect />} />

        {/* Protected: Profile setup */}
        <Route path="/profile/setup" element={
          <ProtectedRoute requiresIncompleteProfile>
            <ProfileSetupPage />
          </ProtectedRoute>
        } />

        {/* Protected: Profile */}
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        {/* Protected: Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />

        {/* Protected: Blood request routes */}
        <Route path="/blood-requests" element={
          <ProtectedRoute><BloodRequestsPage /></ProtectedRoute>
        } />
        <Route path="/blood-requests/new" element={
          <ProtectedRoute><CreateBloodRequestPage /></ProtectedRoute>
        } />
        <Route path="/blood-requests/:id" element={
          <ProtectedRoute><BloodRequestDetailsPage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
