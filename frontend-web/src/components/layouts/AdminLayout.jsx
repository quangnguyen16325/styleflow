import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          transition: 'margin-left var(--transition-normal)',
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div
            className="animate-fadeIn"
            style={{
              padding: 'var(--spacing-xl)',
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <Outlet />
          </div>
        </main>
        {/* Footer */}
        <footer
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          © 2026 StyleFlow Admin Portal • v0.5.0-alpha
        </footer>
      </div>
    </div>
  );
}
