import { AlertTriangle } from 'lucide-react';

export default function ErrorMessage({ error, onRetry, onDismiss }) {
  const code = error?.code || 'ERROR';
  const message = error?.message || 'Something went wrong. Please try again.';

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        background: 'var(--color-danger-light)',
        color: 'var(--color-danger)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-danger)',
        margin: 'var(--spacing-md) 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-md)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <div 
        style={{ 
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <AlertTriangle size={24} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-xs)',
            wordBreak: 'break-word',
          }}
        >
          {code}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-relaxed)',
            color: 'var(--color-text)',
            wordBreak: 'break-word',
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
              flexWrap: 'wrap',
            }}
          >
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-danger btn-sm"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="btn-secondary btn-sm"
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
