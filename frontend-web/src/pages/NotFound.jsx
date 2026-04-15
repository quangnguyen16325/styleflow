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
      padding: '40px',
    }}>
      <div style={{ fontSize: '72px', fontWeight: 800, color: '#e0e0e0', lineHeight: 1, marginBottom: '8px' }}>
        404
      </div>
      <h2 style={{ margin: '0 0 8px 0', color: '#202124', fontSize: '22px' }}>Page Not Found</h2>
      <p style={{ color: '#5f6368', marginBottom: '24px', maxWidth: '400px', fontSize: '14px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
        Back to Dashboard
      </Link>
    </div>
  );
}
