export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'md', 
  fullScreen = false 
}) {
  const sizes = {
    sm: { spinner: '20px', border: '2px', fontSize: '13px' },
    md: { spinner: '32px', border: '3px', fontSize: '14px' },
    lg: { spinner: '48px', border: '4px', fontSize: '15px' },
  };

  const currentSize = sizes[size] || sizes.md;

  const containerStyle = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-overlay)',
        zIndex: 'var(--z-modal)',
        animation: 'fadeIn 0.15s ease-in-out',
      }
    : {
        padding: 'var(--spacing-3xl)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
      };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <div
        className="animate-spin"
        style={{
          width: currentSize.spinner,
          height: currentSize.spinner,
          border: `${currentSize.border} solid var(--color-border)`,
          borderRadius: 'var(--radius-full)',
          borderTopColor: 'var(--color-primary)',
          marginBottom: 'var(--spacing-md)',
        }}
        aria-hidden="true"
      />
      {message && (
        <p
          style={{
            margin: 0,
            color: fullScreen ? 'var(--color-surface)' : 'var(--color-text-secondary)',
            fontSize: currentSize.fontSize,
            fontWeight: 'var(--font-weight-normal)',
          }}
        >
          {message}
        </p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
}
