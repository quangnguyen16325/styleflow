const STATUS_COLORS = {
  // Order statuses - Cloudflare colors
  pending:          { color: '#F59E0B', bg: '#FEF3C7' },
  awaiting_payment: { color: '#F59E0B', bg: '#FEF3C7' },
  paid:             { color: '#3B82F6', bg: '#DBEAFE' },
  processing:       { color: '#8B5CF6', bg: '#EDE9FE' },
  shipping:         { color: '#06B6D4', bg: '#CFFAFE' },
  completed:        { color: '#059669', bg: '#D1FAE5' },
  cancelled:        { color: '#6B7280', bg: '#F3F4F6' },
  failed:           { color: '#DC2626', bg: '#FEE2E2' },
  returning:        { color: '#78716C', bg: '#F5F5F4' },
  returned:         { color: '#78716C', bg: '#F5F5F4' },
  delivery_failed:  { color: '#DC2626', bg: '#FEE2E2' },
  retry_pending:    { color: '#F59E0B', bg: '#FEF3C7' },
  ready_to_ship:    { color: '#3B82F6', bg: '#DBEAFE' },
  handover:         { color: '#06B6D4', bg: '#CFFAFE' },
  in_transit:       { color: '#06B6D4', bg: '#CFFAFE' },
  delivered:        { color: '#059669', bg: '#D1FAE5' },

  // Issue statuses
  open:             { color: '#DC2626', bg: '#FEE2E2' },
  investigating:    { color: '#F59E0B', bg: '#FEF3C7' },
  resolved:         { color: '#059669', bg: '#D1FAE5' },
  ignored:          { color: '#6B7280', bg: '#F3F4F6' },

  // Issue severity
  low:              { color: '#059669', bg: '#D1FAE5' },
  medium:           { color: '#F59E0B', bg: '#FEF3C7' },
  high:             { color: '#F97316', bg: '#FFEDD5' },
  critical:         { color: '#DC2626', bg: '#FEE2E2' },

  // Issue types
  MANUAL_REVIEW:    { color: '#8B5CF6', bg: '#EDE9FE' },
  PAYMENT_ERROR:    { color: '#DC2626', bg: '#FEE2E2' },
  ORDER_FAILED:     { color: '#DC2626', bg: '#FEE2E2' },
  LOW_STOCK:        { color: '#F59E0B', bg: '#FEF3C7' },
  DELIVERY_FAILED:  { color: '#DC2626', bg: '#FEE2E2' },

  // Refund statuses
  manual_review_required: { color: '#8B5CF6', bg: '#EDE9FE' },
  approved:               { color: '#059669', bg: '#D1FAE5' },
  rejected:               { color: '#DC2626', bg: '#FEE2E2' },
  refunded:               { color: '#10B981', bg: '#D1FAE5' },

  // Address change statuses
  requested:        { color: '#F59E0B', bg: '#FEF3C7' },
  pending_approval: { color: '#F59E0B', bg: '#FEF3C7' },
  rejected_timeout: { color: '#6B7280', bg: '#F3F4F6' },

  // Delivery events (uppercase payloads)
  FAILED:           { color: '#DC2626', bg: '#FEE2E2' },
  DELIVERED:        { color: '#059669', bg: '#D1FAE5' },
  IN_TRANSIT:       { color: '#06B6D4', bg: '#CFFAFE' },
  HANDOVER:         { color: '#06B6D4', bg: '#CFFAFE' },
  RETURNED:         { color: '#78716C', bg: '#F5F5F4' },
};

const DEFAULT = { color: '#6B7280', bg: '#F3F4F6' };

export default function StatusBadge({ value, showIcon = false, size = 'md', style = {} }) {
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
    >
      <span>{displayText}</span>
    </span>
  );
}
