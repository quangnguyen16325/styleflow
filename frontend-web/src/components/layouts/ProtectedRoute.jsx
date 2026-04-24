import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  clearAdminSession,
  getStoredAdminToken,
  getStoredAdminUser,
  isPrivilegedRole,
  isTokenExpired,
} from '../../utils/auth';

export default function ProtectedRoute() {
  const token = getStoredAdminToken();
  const user = getStoredAdminUser();
  const location = useLocation();

  // No token or user - redirect to login
  if (!token || !user) {
    clearAdminSession();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Token expired - redirect to login with expired flag
  if (isTokenExpired(token)) {
    clearAdminSession();
    return <Navigate to="/login" state={{ from: location, expired: true }} replace />;
  }

  // User doesn't have admin/staff role - show access denied
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
          padding: 'var(--spacing-lg)',
        }}
      >
        <div
          className="card"
          style={{
            padding: 'var(--spacing-3xl)',
            textAlign: 'center',
            maxWidth: '480px',
            width: '100%',
          }}
        >
          <div 
            style={{ 
              fontSize: '48px', 
              marginBottom: 'var(--spacing-lg)', 
              opacity: 0.4 
            }}
            role="img"
            aria-label="Access denied"
          >
            🚫
          </div>
          <h2 
            style={{ 
              marginBottom: 'var(--spacing-sm)', 
              color: 'var(--color-danger)', 
              fontSize: 'var(--font-size-xl)' 
            }}
          >
            Access Denied
          </h2>
          <p 
            style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: 'var(--spacing-lg)', 
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
            }}
          >
            You don't have permission to access the admin portal. Only admin and staff accounts are allowed.
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
