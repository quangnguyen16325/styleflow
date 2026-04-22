import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: 'var(--spacing-3xl)',
    }}>
      <div style={{ fontSize: '64px', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-border)', lineHeight: 1, marginBottom: 'var(--spacing-md)' }}>
        404
      </div>
      <h2 style={{ margin: '0 0 var(--spacing-xs) 0', color: 'var(--color-dark)', fontSize: 'var(--font-size-xl)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: '400px', fontSize: 'var(--font-size-sm)' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
        Back to Dashboard
      </Link>
    </div>
  );
}
