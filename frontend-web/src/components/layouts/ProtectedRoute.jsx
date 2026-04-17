import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  clearAdminSession,
  getStoredAdminToken,
  getStoredAdminUser,
  isPrivilegedRole,
  isTokenExpired,
} from '../../utils/auth';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute() {
  const token = getStoredAdminToken();
  const user = getStoredAdminUser();
  const location = useLocation();

  // Check authentication
  if (!token || !user) {
    clearAdminSession();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check token expiration
  if (isTokenExpired(token)) {
    clearAdminSession();
    return <Navigate to="/login" state={{ from: location, expired: true }} replace />;
  }

  // Check role authorization
  if (!isPrivilegedRole(user.role)) {
    clearAdminSession();
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div
          className="card animate-slideUp"
          style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-lg)' }}>🚫</div>
          <h2 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>
            Access Denied
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
            You don't have permission to access the admin portal.
          </p>
          <button
            onClick={() => {
              clearAdminSession();
              window.location.href = '/login';
            }}
            className="btn-primary"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
