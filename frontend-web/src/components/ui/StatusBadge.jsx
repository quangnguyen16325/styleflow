const STATUS_COLORS = {
  // Order statuses
  pending:          { color: '#e65100', bg: '#fff3e0', icon: '⏳' },
  awaiting_payment: { color: '#f57f17', bg: '#fffde7', icon: '💳' },
  paid:             { color: '#1565c0', bg: '#e3f2fd', icon: '✓' },
  processing:       { color: '#6a1b9a', bg: '#f3e5f5', icon: '⚙️' },
  shipping:         { color: '#00838f', bg: '#e0f7fa', icon: '🚚' },
  completed:        { color: '#2e7d32', bg: '#e8f5e9', icon: '✓' },
  cancelled:        { color: '#c62828', bg: '#ffebee', icon: '✕' },
  failed:           { color: '#b71c1c', bg: '#ffcdd2', icon: '✕' },
  returning:        { color: '#6d4c41', bg: '#efebe9', icon: '↩' },
  returned:         { color: '#5d4037', bg: '#d7ccc8', icon: '↩' },
  delivery_failed:  { color: '#bf360c', bg: '#fbe9e7', icon: '⚠' },
  retry_pending:    { color: '#ef6c00', bg: '#fff3e0', icon: '🔄' },
  ready_to_ship:    { color: '#1565c0', bg: '#e3f2fd', icon: '📦' },
  handover:         { color: '#00838f', bg: '#e0f7fa', icon: '🤝' },
  in_transit:       { color: '#0277bd', bg: '#e1f5fe', icon: '🚚' },
  delivered:        { color: '#2e7d32', bg: '#e8f5e9', icon: '✓' },

  // Issue statuses
  open:             { color: '#d84315', bg: '#fbe9e7', icon: '🔴' },
  investigating:    { color: '#e65100', bg: '#fff3e0', icon: '🔍' },
  resolved:         { color: '#2e7d32', bg: '#e8f5e9', icon: '✓' },
  ignored:          { color: '#616161', bg: '#f5f5f5', icon: '—' },

  // Issue severity
  low:              { color: '#2e7d32', bg: '#e8f5e9', icon: '●' },
  medium:           { color: '#f57f17', bg: '#fffde7', icon: '●' },
  high:             { color: '#c62828', bg: '#ffebee', icon: '●' },
  critical:         { color: '#b71c1c', bg: '#ffcdd2', icon: '●' },

  // Issue types
  MANUAL_REVIEW:    { color: '#6a1b9a', bg: '#f3e5f5', icon: '👁' },
  PAYMENT_ERROR:    { color: '#c62828', bg: '#ffebee', icon: '💳' },
  ORDER_FAILED:     { color: '#b71c1c', bg: '#ffcdd2', icon: '✕' },
  LOW_STOCK:        { color: '#e65100', bg: '#fff3e0', icon: '📦' },
  DELIVERY_FAILED:  { color: '#d84315', bg: '#fbe9e7', icon: '🚚' },

  // Refund statuses
  manual_review_required: { color: '#6a1b9a', bg: '#f3e5f5', icon: '👁' },
  approved:               { color: '#2e7d32', bg: '#e8f5e9', icon: '✓' },
  rejected:               { color: '#c62828', bg: '#ffebee', icon: '✕' },
  refunded:               { color: '#00695c', bg: '#e0f2f1', icon: '💰' },

  // Address change statuses
  requested:        { color: '#ef6c00', bg: '#fff3e0', icon: '📍' },
  pending_approval: { color: '#ef6c00', bg: '#fff3e0', icon: '⏳' },
  rejected_timeout: { color: '#6d4c41', bg: '#efebe9', icon: '⏱' },

  // Delivery events (uppercase payloads)
  FAILED:           { color: '#b71c1c', bg: '#ffcdd2', icon: '✕' },
  DELIVERED:        { color: '#2e7d32', bg: '#e8f5e9', icon: '✓' },
  IN_TRANSIT:       { color: '#0277bd', bg: '#e1f5fe', icon: '🚚' },
  HANDOVER:         { color: '#00838f', bg: '#e0f7fa', icon: '🤝' },
  RETURNED:         { color: '#5d4037', bg: '#d7ccc8', icon: '↩' },
};

const DEFAULT = { color: '#616161', bg: '#eeeeee', icon: '●' };

export default function StatusBadge({ value, showIcon = true, size = 'md', style = {} }) {
  if (!value) return null;
  
  const scheme = STATUS_COLORS[value] || DEFAULT;
  const displayText = value.replace(/_/g, ' ');

  const sizes = {
    sm: { padding: '3px 8px', fontSize: '11px', iconSize: '10px' },
    md: { padding: '5px 12px', fontSize: '12px', iconSize: '12px' },
    lg: { padding: '6px 14px', fontSize: '13px', iconSize: '14px' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <span
      className="animate-fadeIn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: currentSize.padding,
        borderRadius: 'var(--radius-full)',
        fontSize: currentSize.fontSize,
        fontWeight: 'var(--font-weight-semibold)',
        color: scheme.color,
        backgroundColor: scheme.bg,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        letterSpacing: '0.3px',
        border: `1px solid ${scheme.color}20`,
        transition: 'all var(--transition-fast)',
        ...style,
      }}
    >
      {showIcon && (
        <span style={{ fontSize: currentSize.iconSize, lineHeight: 1 }}>
          {scheme.icon}
        </span>
      )}
      <span>{displayText}</span>
    </span>
  );
}
