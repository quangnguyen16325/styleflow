import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, Package, Tags, ShoppingCart, AlertTriangle, Receipt } from 'lucide-react';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Inventory', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/issues', label: 'Issues', icon: AlertTriangle },
  { to: '/refund-requests', label: 'Refunds', icon: Receipt },
];

export default function Sidebar({ collapsed = false, onToggle, isMobile = false }) {
  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (!isMobile || collapsed) return;

    const handleClickOutside = (e) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(e.target)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, collapsed, onToggle]);

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

  const handleNavClick = () => {
    if (isMobile && !collapsed) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-overlay)',
            zIndex: 'var(--z-modal-backdrop)',
          }}
          onClick={onToggle}
        />
      )}

      <aside
        id="sidebar"
        style={{
          width: collapsed ? (isMobile ? '0' : '64px') : '220px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width var(--transition-normal)',
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: isMobile ? 'var(--z-modal)' : 'auto',
          overflow: 'hidden',
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
            flexShrink: 0,
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
          {!collapsed && !isMobile && (
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
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              ◀
            </button>
          )}
        </div>

        {collapsed && !isMobile && (
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
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            ▶
          </button>
        )}

        <nav 
          style={{ 
            flex: 1, 
            padding: 'var(--spacing-md) var(--spacing-sm) var(--spacing-md) 0', 
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={linkStyle}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onMouseEnter={hoverStyle}
              onMouseLeave={leaveStyle}
              onClick={handleNavClick}
              title={collapsed ? item.label : ''}
              aria-label={item.label}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <item.icon size={20} strokeWidth={2} />
              </span>
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
              flexShrink: 0,
            }}
          >
            v0.5.0
          </div>
        )}
      </aside>
    </>
  );
}
