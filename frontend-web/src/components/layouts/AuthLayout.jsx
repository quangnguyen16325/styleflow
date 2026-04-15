import { Navigate, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  // If already logged in, redirect to dashboard
  const token = localStorage.getItem('admin_token');
  if (token) {
    return <Navigate to="/" replace />;
  }

  // Login page handles its own full-page layout
  return <Outlet />;
}
