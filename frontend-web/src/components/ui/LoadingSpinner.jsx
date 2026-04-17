export default function LoadingSpinner({ message = 'Loading...', size = 'md', fullScreen = false }) {
  const sizes = {
    sm: { spinner: '24px', border: '2px', fontSize: '13px' },
    md: { spinner: '40px', border: '3px', fontSize: '14px' },
    lg: { spinner: '56px', border: '4px', fontSize: '16px' },
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
        backdropFilter: 'blur(4px)',
      }
    : {
        padding: 'var(--spacing-2xl)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
      };

  return (
    <div style={containerStyle} className="animate-fadeIn">
      <div
        className="animate-spin"
        style={{
          width: currentSize.spinner,
          height: currentSize.spinner,
          border: `${currentSize.border} solid var(--color-border-light)`,
          borderRadius: 'var(--radius-full)',
          borderTopColor: 'var(--color-primary)',
          marginBottom: 'var(--spacing-md)',
        }}
      />
      {message && (
        <p
          style={{
            margin: 0,
            color: fullScreen ? 'var(--color-surface)' : 'var(--color-text-secondary)',
            fontSize: currentSize.fontSize,
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
