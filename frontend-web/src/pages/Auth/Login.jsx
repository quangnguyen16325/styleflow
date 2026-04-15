import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApiService from '../../api';
import ErrorMessage from '../../components/ui/ErrorMessage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.login(email, password);
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-page::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          top: -200px;
          right: -100px;
          pointer-events: none;
        }

        .login-page::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
          bottom: -150px;
          left: -100px;
          pointer-events: none;
        }

        .login-card {
          width: 420px;
          padding: 48px 40px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          position: relative;
          z-index: 1;
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .login-brand {
          text-align: center;
          margin-bottom: 36px;
        }

        .login-brand-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -1px;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }

        .login-brand h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.5px;
        }

        .login-brand p {
          margin: 6px 0 0;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 400;
        }

        .login-field {
          margin-bottom: 20px;
        }

        .login-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
          letter-spacing: 0.3px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input-wrap input {
          width: 100%;
          padding: 14px 16px;
          padding-right: 48px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px;
          font-size: 15px;
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .login-input-wrap input::placeholder {
          color: #64748b;
        }

        .login-input-wrap input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .login-toggle-pw {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: color 0.2s;
          font-family: 'Inter', sans-serif;
        }

        .login-toggle-pw:hover {
          color: #94a3b8;
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          margin-top: 8px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
          letter-spacing: 0.2px;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 28px;
          font-size: 12px;
          color: #475569;
        }

        .login-error-wrap {
          animation: shakeIn 0.4s ease;
        }

        @keyframes shakeIn {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">SF</div>
            <h1>StyleFlow</h1>
            <p>Admin Control Panel</p>
          </div>

          {error && (
            <div className="login-error-wrap">
              <ErrorMessage error={error} />
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@styleflow.vn"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-footer">
            StyleFlow Admin &middot; Internal Use Only
          </div>
        </div>
      </div>
    </>
  );
}
