import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={handleToggleSidebar}
        isMobile={isMobile}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <Header onToggleSidebar={handleToggleSidebar} isMobile={isMobile} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            style={{
              padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)',
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <Outlet />
          </div>
        </main>
        <footer
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          © 2026 StyleFlow • v0.5.0
        </footer>
      </div>
    </div>
  );
}
