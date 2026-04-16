import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {
  clearAdminSession,
  getStoredAdminToken,
  hasValidAdminSession,
} from '../../utils/auth';

export default function AuthLayout() {
  const hasSession = hasValidAdminSession();

  useEffect(() => {
    if (!hasSession && getStoredAdminToken()) {
      clearAdminSession();
    }
  }, [hasSession]);

  // If already logged in with valid admin/staff session, redirect to dashboard.
  if (hasSession) {
    return <Navigate to="/" replace />;
  }

  // Login page handles its own full-page layout
  return <Outlet />;
}
