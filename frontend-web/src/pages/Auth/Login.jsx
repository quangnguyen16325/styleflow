import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApiService from '../../api';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clearAdminSession, isPrivilegedRole } from '../../utils/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.login(email, password);
      if (!isPrivilegedRole(response?.customer?.role)) {
        clearAdminSession();
        setError({
          code: 'FORBIDDEN',
          message: 'Only admin/staff accounts can access the admin portal.',
        });
        return;
      }

      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.customer));
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: 'var(--spacing-xl)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-xl)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto var(--spacing-md)',
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#fff',
          }}>
            SF
          </div>
          <h1 style={{
            margin: '0 0 var(--spacing-xs) 0',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-dark)',
          }}>
            StyleFlow
          </h1>
          <p style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            Admin Portal
          </p>
        </div>

        <div className="card" style={{
          padding: 'var(--spacing-xl)',
        }}>
          {error && <ErrorMessage error={error} />}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@styleflow.vn"
                autoComplete="email"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 'var(--spacing-lg)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
        }}>
          StyleFlow Admin • Internal Use Only
        </div>
      </div>
    </div>
  );
}
