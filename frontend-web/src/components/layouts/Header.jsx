import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const userJson = localStorage.getItem('admin_user');
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0
    }}>
      <div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {user ? (
          <>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#202124' }}>{user.fullName}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#5f6368', textTransform: 'capitalize' }}>{user.role}</p>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1a73e8',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <button onClick={handleLogout} style={{ marginLeft: '10px', padding: '6px 12px', background: '#f1f3f4', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Log Out
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#202124' }}>Guest</p>
          </div>
        )}
      </div>
    </header>
  );
}
