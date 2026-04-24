export default function EmptyState({ 
  icon = '📭', 
  title = 'No Data', 
  description = 'There is nothing to display here right now.',
  action,
  actionLabel,
}) {
  return (
    <div
      style={{
        padding: 'var(--spacing-3xl) var(--spacing-xl)',
        textAlign: 'center',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: 'var(--spacing-md)',
          opacity: 0.4,
        }}
        role="img"
        aria-label={typeof icon === 'string' ? 'Empty state icon' : ''}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: '0 0 var(--spacing-xs) 0',
          color: 'var(--color-dark)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          maxWidth: '400px',
          lineHeight: 'var(--line-height-relaxed)',
        }}
      >
        {description}
      </p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="btn-primary"
          style={{ marginTop: 'var(--spacing-lg)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
