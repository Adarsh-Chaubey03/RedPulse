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
  const { isAuthenticated, isInitialized, user } = useAuthStore();

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
