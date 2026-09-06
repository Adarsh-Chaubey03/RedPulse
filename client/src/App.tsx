import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken, getCurrentUser, logoutUser } from './features/auth/services/authApi';

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

// ─── Root redirect ────────────────────────────────────────────────────────────

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isProfileComplete) return <Navigate to="/profile/setup" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { isAuthenticated, user } = useAuthStore();

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
  };

  return (
    <BrowserRouter>
      <AuthInitializer />

      <nav style={{
        display: 'flex', gap: '1rem', padding: '0.75rem 2rem',
        borderBottom: '1px solid #ddd', alignItems: 'center',
        background: '#fff', position: 'sticky', top: 0, zIndex: 100,
      }}>
        {!isAuthenticated ? (
          <>
            <span style={{ fontWeight: 700, color: '#c0392b', marginRight: '0.5rem' }}>🩸 RedPulse</span>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 700, color: '#c0392b', marginRight: '0.5rem' }}>🩸 RedPulse</span>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/blood-requests">Blood Requests</Link>
            {user?.role !== 'donor' && (
              <Link to="/blood-requests/new">+ New Request</Link>
            )}
            <Link to="/profile">Profile</Link>
            <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.875rem' }}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
              {' '}
              <span style={{
                fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: 10,
                background: '#f0f0f0', color: '#555',
              }}>
                {user?.role}
              </span>
            </span>
            <button type="button" onClick={handleLogout}
              style={{ padding: '0.3rem 0.8rem', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>
              Logout
            </button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/profile/setup" element={
          <ProtectedRoute requiresIncompleteProfile>
            <ProfileSetupPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />

        {/* Blood request routes */}
        <Route path="/blood-requests" element={
          <ProtectedRoute><BloodRequestsPage /></ProtectedRoute>
        } />
        <Route path="/blood-requests/new" element={
          <ProtectedRoute><CreateBloodRequestPage /></ProtectedRoute>
        } />
        <Route path="/blood-requests/:id" element={
          <ProtectedRoute><BloodRequestDetailsPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
