import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 'var(--spacing-3xl)',
      }}
    >
      <div
        style={{
          fontSize: '80px',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-border)',
          lineHeight: 1,
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        404
      </div>
      <h2
        style={{
          margin: '0 0 var(--spacing-sm) 0',
          color: 'var(--color-dark)',
          fontSize: 'var(--font-size-2xl)',
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-xl)',
          maxWidth: '450px',
          fontSize: 'var(--font-size-base)',
          lineHeight: 'var(--line-height-relaxed)',
        }}
      >
        The page you're looking for doesn't exist or has been moved. Please check the URL or return to the dashboard.
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go Back
        </button>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
