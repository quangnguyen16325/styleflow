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
