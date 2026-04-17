export default function EmptyState({ 
  icon = '📭', 
  title = 'No Data', 
  description = 'There is nothing to display here right now.',
  action,
  actionLabel,
}) {
  return (
    <div
      className="animate-fadeIn"
      style={{
        padding: 'var(--spacing-2xl) var(--spacing-lg)',
        textAlign: 'center',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '2px dashed var(--color-border)',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          marginBottom: 'var(--spacing-lg)',
          opacity: 0.6,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: '0 0 var(--spacing-sm) 0',
          color: 'var(--color-dark)',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-base)',
          maxWidth: '400px',
          lineHeight: 'var(--line-height-normal)',
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
