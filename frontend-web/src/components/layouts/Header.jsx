import { useNavigate } from 'react-router-dom';
import { clearAdminSession, getStoredAdminUser } from '../../utils/auth';

export default function Header({ onToggleSidebar, isMobile }) {
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
        height: '56px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 var(--spacing-md)' : '0 var(--spacing-xl)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              fontSize: 'var(--font-size-lg)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <h1
          style={{
            fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-dark)',
            margin: 0,
          }}
        >
          Admin Portal
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}>
        {user ? (
          <>
            {!isMobile && (
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
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
            )}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-xs)',
              }}
              title={isMobile ? user.fullName : ''}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary btn-sm"
              aria-label="Log out"
            >
              {isMobile ? '↪' : 'Log out'}
            </button>
          </>
        ) : (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-normal)',
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
