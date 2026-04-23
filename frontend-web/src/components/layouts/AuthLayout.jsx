import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  clearAdminSession,
  getStoredAdminToken,
  hasValidAdminSession,
} from '../../utils/auth';

export default function AuthLayout() {
  const hasSession = hasValidAdminSession();
  const location = useLocation();

  useEffect(() => {
    if (!hasSession && getStoredAdminToken()) {
      clearAdminSession();
    }
  }, [hasSession]);

  // If already logged in with valid admin/staff session, redirect to dashboard or intended page
  if (hasSession) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  // Login page handles its own full-page layout
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Outlet />
    </div>
  );
}
