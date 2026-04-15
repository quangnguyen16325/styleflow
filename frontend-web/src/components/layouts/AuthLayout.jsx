import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>
      <Outlet />
    </div>
  );
}
