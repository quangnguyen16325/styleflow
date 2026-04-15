import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('admin_token');
  const location = useLocation();

  if (!token) {
    // Save intended destination so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
