import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Inventory Info', icon: '📦' },
  { to: '/categories', label: 'Categories', icon: '🏷️' },
  { to: '/orders', label: 'Order Management', icon: '🛒' },
  { to: '/issues', label: 'Issues Tracking', icon: '⚠️' },
  { to: '/refund-requests', label: 'Refund Requests', icon: '💸' },
];

export default function Sidebar({ collapsed = false, onToggle }) {
  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: collapsed ? 'var(--spacing-md)' : '12px var(--spacing-md)',
    color: isActive ? '#fff' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
    fontSize: 'var(--font-size-sm)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    marginBottom: 'var(--spacing-xs)',
    transition: 'all var(--transition-fast)',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative',
  });

  const hoverStyle = (e) => {
    if (!e.currentTarget.classList.contains('active')) {
      e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
      e.currentTarget.style.color = '#cbd5e1';
    }
  };

  const leaveStyle = (e) => {
    if (!e.currentTarget.classList.contains('active')) {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = '#94a3b8';
    }
  };

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        backgroundColor: '#0f172a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width var(--transition-normal)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 'var(--z-sticky)',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? 'var(--spacing-lg) var(--spacing-sm)' : 'var(--spacing-lg) var(--spacing-md)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 'var(--spacing-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#fff',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            SF
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  letterSpacing: '-0.5px',
                }}
              >
                StyleFlow
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: '#64748b',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                Admin Portal
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              fontSize: 'var(--font-size-lg)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#cbd5e1')}
            onMouseLeave={(e) => (e.target.style.color = '#64748b')}
            title="Collapse sidebar"
          >
            ◀
          </button>
        )}
      </div>

      {/* Toggle button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
            cursor: 'pointer',
            padding: 'var(--spacing-xs)',
            fontSize: 'var(--font-size-lg)',
            margin: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.1)';
          }}
          title="Expand sidebar"
        >
          ▶
        </button>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: 'var(--spacing-md) var(--spacing-sm) var(--spacing-md) 0', overflowY: 'auto' }}>
        {!collapsed && (
          <div
            style={{
              padding: '0 var(--spacing-md)',
              marginBottom: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Menu
          </div>
        )}
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={linkStyle}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onMouseEnter={hoverStyle}
            onMouseLeave={leaveStyle}
            title={collapsed ? item.label : ''}
          >
            <span style={{ fontSize: 'var(--font-size-lg)' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid rgba(148,163,184,0.1)',
            fontSize: 'var(--font-size-xs)',
            color: '#475569',
            textAlign: 'center',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          v0.5.0-alpha
        </div>
      )}
    </aside>
  );
}
