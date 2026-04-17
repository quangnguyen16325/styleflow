import { useNavigate } from 'react-router-dom';
import { clearAdminSession, getStoredAdminUser } from '../../utils/auth';

export default function Header() {
  const navigate = useNavigate();
  const user = getStoredAdminUser();

  const handleLogout = () => {
    clearAdminSession();
    navigate('/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-xl)',
        flexShrink: 0,
        boxShadow: 'var(--shadow-xs)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
      }}
    >
      {/* Left side - Breadcrumb or Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-dark)',
            margin: 0,
          }}
        >
          Admin Portal
        </h1>
      </div>

      {/* Right side - User menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {user ? (
          <>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-dark)',
                  lineHeight: 1.3,
                }}
              >
                {user.fullName}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {user.role}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-sm)',
                letterSpacing: '-0.5px',
                boxShadow: 'var(--shadow-sm)',
                border: '2px solid var(--color-surface)',
              }}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary btn-sm"
              style={{
                marginLeft: 'var(--spacing-xs)',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--color-danger)';
                e.target.style.borderColor = 'var(--color-danger)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--color-text)';
                e.target.style.borderColor = 'var(--color-border)';
              }}
            >
              🚪 Log Out
            </button>
          </>
        ) : (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Guest
          </div>
        )}
      </div>
    </header>
  );
}
