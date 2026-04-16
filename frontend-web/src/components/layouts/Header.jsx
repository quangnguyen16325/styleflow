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
    ? user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <header style={{
      height: '60px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#202124', lineHeight: 1.3 }}>{user.fullName}</div>
              <div style={{ fontSize: '11px', color: '#5f6368', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', letterSpacing: '-0.5px',
            }}>
              {initials}
            </div>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: '4px', padding: '7px 14px',
                background: 'transparent', border: '1px solid #e0e0e0',
                borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                color: '#5f6368', transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.target.style.background = '#f1f3f4'; e.target.style.color = '#c62828'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#5f6368'; }}
            >
              Log Out
            </button>
          </>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#5f6368' }}>Guest</div>
        )}
      </div>
    </header>
  );
}
