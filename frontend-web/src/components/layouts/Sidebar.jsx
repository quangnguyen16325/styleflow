import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const linkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '12px 20px',
    color: isActive ? '#fff' : '#b0b1b3',
    backgroundColor: isActive ? '#1a73e8' : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 'bold' : 'normal',
    borderRadius: '4px',
    marginBottom: '8px',
    transition: 'background 0.2s'
  });

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#202124',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      padding: '20px'
    }}>
      <div style={{ marginBottom: '40px', padding: '0 20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>StyleFlow</h2>
        <span style={{ fontSize: '12px', color: '#9aa0a6' }}>Admin Portal</span>
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink to="/" style={linkStyle} end>
          Dashboard
        </NavLink>
        <NavLink to="/products" style={linkStyle}>
          Inventory Info
        </NavLink>
        <NavLink to="/orders" style={linkStyle}>
          Order Management
        </NavLink>
        <NavLink to="/issues" style={linkStyle}>
          Issues Tracking
        </NavLink>
      </nav>

      <div style={{ padding: '20px', fontSize: '12px', color: '#5f6368', textAlign: 'center' }}>
        v0.5.0-alpha
      </div>
    </aside>
  );
}
