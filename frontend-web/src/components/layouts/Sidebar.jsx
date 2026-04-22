import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/products', label: 'Inventory', icon: '📦' },
  { to: '/categories', label: 'Categories', icon: '🏷️' },
  { to: '/orders', label: 'Orders', icon: '🛒' },
  { to: '/issues', label: 'Issues', icon: '⚠️' },
  { to: '/refund-requests', label: 'Refunds', icon: '💸' },
];

export default function Sidebar({ collapsed = false, onToggle }) {
  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: collapsed ? 'var(--spacing-md)' : '10px var(--spacing-md)',
    color: isActive ? 'var(--color-primary)' : '#64748b',
    backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
    borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
    textDecoration: 'none',
    fontWeight: 'var(--font-weight-medium)',
    fontSize: 'var(--font-size-sm)',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    marginBottom: '2px',
    transition: 'all var(--transition-fast)',
    justifyContent: collapsed ? 'center' : 'flex-start',
  });

  const hoverStyle = (e) => {
    if (!e.currentTarget.classList.contains('active')) {
      e.currentTarget.style.backgroundColor = 'var(--color-bg)';
      e.currentTarget.style.color = 'var(--color-text)';
    }
  };

  const leaveStyle = (e) => {
    if (!e.currentTarget.classList.contains('active')) {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = '#64748b';
    }
  };

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '220px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width var(--transition-normal)',
      }}
    >
      <div
        style={{
          padding: collapsed ? 'var(--spacing-lg) var(--spacing-sm)' : 'var(--spacing-lg) var(--spacing-md)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 'var(--spacing-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#fff',
            }}
          >
            SF
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-dark)',
                }}
              >
                StyleFlow
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
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              fontSize: 'var(--font-size-md)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.target.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.target.style.color = 'var(--color-text-muted)')}
            title="Collapse"
          >
            ◀
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 'var(--spacing-xs)',
            fontSize: 'var(--font-size-md)',
            margin: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--color-bg)';
            e.target.style.color = 'var(--color-text)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = 'var(--color-text-muted)';
          }}
          title="Expand"
        >
          ▶
        </button>
      )}

      <nav style={{ flex: 1, padding: 'var(--spacing-md) var(--spacing-sm) var(--spacing-md) 0', overflowY: 'auto' }}>
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
            <span style={{ fontSize: 'var(--font-size-md)' }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          v0.5.0
        </div>
      )}
    </aside>
  );
}
