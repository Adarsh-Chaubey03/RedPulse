import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { refreshToken, getCurrentUser, logoutUser } from './features/auth/services/authApi';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import DashboardPage from './features/auth/pages/DashboardPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import ProfileSetupPage from './features/profile/pages/ProfileSetupPage';
import ProfilePage from './features/profile/pages/ProfilePage';

// ─── Session restore on startup ───────────────────────────────────────────────

function AuthInitializer() {
  const { login, logout, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) return;

    const restore = async () => {
      try {
        // Attempt to get a fresh access token using the httpOnly refresh cookie
        const newToken = await refreshToken();
        // Fetch the associated user
        const meResponse = await getCurrentUser();
        login(meResponse.data, newToken);
      } catch {
        // No valid session — treat as unauthenticated (do not redirect here)
        logout();
      } finally {
        setInitialized();
      }
    };

    restore();
  }, [isInitialized, login, logout, setInitialized]);

  return null;
}

// ─── Root redirect based on auth + profile state ─────────────────────────────

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
    try {
      await logoutUser();
    } catch {
      // Proceed with client-side logout even if server call fails
    }
    useAuthStore.getState().logout();
  };

  return (
    <BrowserRouter>
      <AuthInitializer />

      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem 2rem', borderBottom: '1px solid #ddd', alignItems: 'center' }}>
        {!isAuthenticated ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
            <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.875rem' }}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/profile/setup"
          element={
            <ProtectedRoute requiresIncompleteProfile>
              <ProfileSetupPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
