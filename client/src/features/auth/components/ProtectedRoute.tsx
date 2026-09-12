import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When true, this route is for users who have NOT yet completed their profile.
   * Authenticated users with a complete profile are redirected to /dashboard.
   */
  requiresIncompleteProfile?: boolean;
}

export default function ProtectedRoute({
  children,
  requiresIncompleteProfile = false,
}: ProtectedRouteProps) {
  // Subscribe per-field. This component wraps the whole authenticated tree, and
  // a whole-store subscription re-rendered all of it every time accessToken
  // rotated (each session restore and each 401 retry) despite nothing here
  // depending on the token.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isInitialized   = useAuthStore(s => s.isInitialized);
  const user            = useAuthStore(s => s.user);

  // Show a minimal loading state while the startup session restore is in progress
  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#888' }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Profile-setup route: redirect away once profile is complete
  if (requiresIncompleteProfile && user?.isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  // All other protected routes: redirect to setup if profile is incomplete
  if (!requiresIncompleteProfile && !user?.isProfileComplete) {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
}
