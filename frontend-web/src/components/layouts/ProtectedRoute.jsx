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

  if (!token || !user || !isPrivilegedRole(user.role) || isTokenExpired(token)) {
    clearAdminSession();
    // Save intended destination so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
