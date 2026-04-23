const STATUS_COLORS = {
  // Order statuses - Cloudflare colors
  pending:          { color: '#F59E0B', bg: '#FEF3C7', icon: '⏳' },
  awaiting_payment: { color: '#F59E0B', bg: '#FEF3C7', icon: '💳' },
  paid:             { color: '#3B82F6', bg: '#DBEAFE', icon: '✓' },
  processing:       { color: '#8B5CF6', bg: '#EDE9FE', icon: '⚙️' },
  shipping:         { color: '#06B6D4', bg: '#CFFAFE', icon: '🚚' },
  completed:        { color: '#059669', bg: '#D1FAE5', icon: '✓' },
  cancelled:        { color: '#6B7280', bg: '#F3F4F6', icon: '✕' },
  failed:           { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
  returning:        { color: '#78716C', bg: '#F5F5F4', icon: '↩' },
  returned:         { color: '#78716C', bg: '#F5F5F4', icon: '↩' },
  delivery_failed:  { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
  retry_pending:    { color: '#F59E0B', bg: '#FEF3C7', icon: '🔄' },
  ready_to_ship:    { color: '#3B82F6', bg: '#DBEAFE', icon: '📦' },
  handover:         { color: '#06B6D4', bg: '#CFFAFE', icon: '🤝' },
  in_transit:       { color: '#06B6D4', bg: '#CFFAFE', icon: '🚚' },
  delivered:        { color: '#059669', bg: '#D1FAE5', icon: '✓' },

  // Issue statuses
  open:             { color: '#DC2626', bg: '#FEE2E2', icon: '⚠' },
  investigating:    { color: '#F59E0B', bg: '#FEF3C7', icon: '🔍' },
  resolved:         { color: '#059669', bg: '#D1FAE5', icon: '✓' },
  ignored:          { color: '#6B7280', bg: '#F3F4F6', icon: '—' },

  // Issue severity
  low:              { color: '#059669', bg: '#D1FAE5', icon: '•' },
  medium:           { color: '#F59E0B', bg: '#FEF3C7', icon: '••' },
  high:             { color: '#F97316', bg: '#FFEDD5', icon: '•••' },
  critical:         { color: '#DC2626', bg: '#FEE2E2', icon: '⚠' },

  // Issue types
  MANUAL_REVIEW:    { color: '#8B5CF6', bg: '#EDE9FE', icon: '👁' },
  PAYMENT_ERROR:    { color: '#DC2626', bg: '#FEE2E2', icon: '💳' },
  ORDER_FAILED:     { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
  LOW_STOCK:        { color: '#F59E0B', bg: '#FEF3C7', icon: '📦' },
  DELIVERY_FAILED:  { color: '#DC2626', bg: '#FEE2E2', icon: '🚚' },

  // Refund statuses
  manual_review_required: { color: '#8B5CF6', bg: '#EDE9FE', icon: '👁' },
  approved:               { color: '#059669', bg: '#D1FAE5', icon: '✓' },
  rejected:               { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
  refunded:               { color: '#10B981', bg: '#D1FAE5', icon: '💸' },

  // Address change statuses
  requested:        { color: '#F59E0B', bg: '#FEF3C7', icon: '📍' },
  pending_approval: { color: '#F59E0B', bg: '#FEF3C7', icon: '⏳' },
  rejected_timeout: { color: '#6B7280', bg: '#F3F4F6', icon: '⏱' },

  // Delivery events (uppercase payloads)
  FAILED:           { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
  DELIVERED:        { color: '#059669', bg: '#D1FAE5', icon: '✓' },
  IN_TRANSIT:       { color: '#06B6D4', bg: '#CFFAFE', icon: '🚚' },
  HANDOVER:         { color: '#06B6D4', bg: '#CFFAFE', icon: '🤝' },
  RETURNED:         { color: '#78716C', bg: '#F5F5F4', icon: '↩' },
};

const DEFAULT = { color: '#6B7280', bg: '#F3F4F6', icon: '•' };

export default function StatusBadge({ value, size = 'md', showIcon = false, style = {} }) {
  if (!value) return null;
  
  const scheme = STATUS_COLORS[value] || DEFAULT;
  const displayText = value.replace(/_/g, ' ');

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '12px' },
    md: { padding: '3px 10px', fontSize: '13px' },
    lg: { padding: '4px 12px', fontSize: '14px' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: currentSize.padding,
        borderRadius: 'var(--radius-sm)',
        fontSize: currentSize.fontSize,
        fontWeight: 'var(--font-weight-medium)',
        color: scheme.color,
        backgroundColor: scheme.bg,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        border: `1px solid ${scheme.color}30`,
        ...style,
      }}
      role="status"
      aria-label={`Status: ${displayText}`}
    >
      {showIcon && scheme.icon && (
        <span role="img" aria-hidden="true">{scheme.icon}</span>
      )}
      <span>{displayText}</span>
    </span>
  );
}
