const STATUS_COLORS = {
  // Order statuses
  pending:          { color: '#e65100', bg: '#fff3e0' },
  awaiting_payment: { color: '#f57f17', bg: '#fffde7' },
  paid:             { color: '#1565c0', bg: '#e3f2fd' },
  processing:       { color: '#6a1b9a', bg: '#f3e5f5' },
  shipping:         { color: '#00838f', bg: '#e0f7fa' },
  completed:        { color: '#2e7d32', bg: '#e8f5e9' },
  cancelled:        { color: '#c62828', bg: '#ffebee' },
  failed:           { color: '#b71c1c', bg: '#ffcdd2' },
  returning:        { color: '#6d4c41', bg: '#efebe9' },
  returned:         { color: '#5d4037', bg: '#d7ccc8' },
  delivery_failed:  { color: '#bf360c', bg: '#fbe9e7' },
  retry_pending:    { color: '#ef6c00', bg: '#fff3e0' },
  ready_to_ship:    { color: '#1565c0', bg: '#e3f2fd' },
  handover:         { color: '#00838f', bg: '#e0f7fa' },
  in_transit:       { color: '#0277bd', bg: '#e1f5fe' },
  delivered:        { color: '#2e7d32', bg: '#e8f5e9' },

  // Issue statuses
  open:             { color: '#d84315', bg: '#fbe9e7' },
  investigating:    { color: '#e65100', bg: '#fff3e0' },
  resolved:         { color: '#2e7d32', bg: '#e8f5e9' },
  ignored:          { color: '#616161', bg: '#f5f5f5' },

  // Issue severity
  low:              { color: '#2e7d32', bg: '#e8f5e9' },
  medium:           { color: '#f57f17', bg: '#fffde7' },
  high:             { color: '#c62828', bg: '#ffebee' },
  critical:         { color: '#b71c1c', bg: '#ffcdd2' },

  // Issue types
  MANUAL_REVIEW:    { color: '#6a1b9a', bg: '#f3e5f5' },
  PAYMENT_ERROR:    { color: '#c62828', bg: '#ffebee' },
  ORDER_FAILED:     { color: '#b71c1c', bg: '#ffcdd2' },
  LOW_STOCK:        { color: '#e65100', bg: '#fff3e0' },
  DELIVERY_FAILED:  { color: '#d84315', bg: '#fbe9e7' },

  // Refund statuses
  manual_review_required: { color: '#6a1b9a', bg: '#f3e5f5' },
  approved:               { color: '#2e7d32', bg: '#e8f5e9' },
  rejected:               { color: '#c62828', bg: '#ffebee' },
  refunded:               { color: '#00695c', bg: '#e0f2f1' },

  // Address change statuses
  requested:        { color: '#ef6c00', bg: '#fff3e0' },
  pending_approval: { color: '#ef6c00', bg: '#fff3e0' },
  rejected_timeout: { color: '#6d4c41', bg: '#efebe9' },

  // Delivery events (uppercase payloads)
  FAILED:           { color: '#b71c1c', bg: '#ffcdd2' },
  DELIVERED:        { color: '#2e7d32', bg: '#e8f5e9' },
  IN_TRANSIT:       { color: '#0277bd', bg: '#e1f5fe' },
  HANDOVER:         { color: '#00838f', bg: '#e0f7fa' },
  RETURNED:         { color: '#5d4037', bg: '#d7ccc8' },
};

const DEFAULT = { color: '#616161', bg: '#eeeeee' };

export default function StatusBadge({ value, style = {} }) {
  if (!value) return null;
  const scheme = STATUS_COLORS[value] || DEFAULT;
  const displayText = value.replace(/_/g, ' ');

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      color: scheme.color,
      backgroundColor: scheme.bg,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px',
      ...style,
    }}>
      {displayText}
    </span>
  );
}
