export default function ErrorMessage({ error, onRetry, onDismiss }) {
  const code = error?.code || 'ERROR';
  const message = error?.message || 'Something went wrong. Please try again.';

  return (
    <div
      className="animate-slideDown"
      style={{
        padding: 'var(--spacing-lg)',
        background: 'var(--color-danger-light)',
        color: 'var(--color-danger)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-danger)',
        margin: 'var(--spacing-md) 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-md)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ⚠️
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--font-size-base)',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          [{code}]
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-normal)',
            color: 'var(--color-danger)',
          }}
        >
          {message}
        </p>
        {(onRetry || onDismiss) && (
          <div
            style={{
              marginTop: 'var(--spacing-md)',
              display: 'flex',
              gap: 'var(--spacing-sm)',
            }}
          >
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-sm"
                style={{
                  padding: '6px 12px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                🔄 Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="btn-sm"
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
