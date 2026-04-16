import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Inventory Info', icon: '📦' },
  { to: '/orders', label: 'Order Management', icon: '🛒' },
  { to: '/issues', label: 'Issues Tracking', icon: '⚠️' },
  { to: '/refund-requests', label: 'Refund Requests', icon: '💸' },
];

export default function Sidebar() {
  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 16px',
    color: isActive ? '#fff' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400,
    fontSize: '14px',
    borderRadius: '0 6px 6px 0',
    marginBottom: '4px',
    transition: 'all 0.15s ease',
  });

  return (
    <aside style={{
      width: '250px',
      backgroundColor: '#0f172a',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 28px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 800, color: '#fff',
          }}>SF</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>StyleFlow</div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 8px 16px 0' }}>
        <div style={{ padding: '0 16px', marginBottom: '8px', fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Menu
        </div>
        {menuItems.map((item) => (
          <NavLink key={item.to} to={item.to} style={linkStyle} end={item.end}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(148,163,184,0.1)', fontSize: '11px', color: '#475569', textAlign: 'center' }}>
        v0.5.0-alpha
      </div>
    </aside>
  );
}
