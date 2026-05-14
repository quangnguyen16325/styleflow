import {
  Clock, CreditCard, Check, Settings, Truck, X, Undo2, RefreshCw, Package, Handshake, AlertTriangle, Search, Eye, MapPin, Timer, Minus, CircleDot, Receipt
} from 'lucide-react';

const STATUS_COLORS = {
  // Order statuses - Cloudflare colors
  pending:          { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  awaiting_payment: { color: '#F59E0B', bg: '#FEF3C7', icon: CreditCard },
  unpaid:           { color: '#6B7280', bg: '#F3F4F6', icon: CreditCard },
  payment_pending:  { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  payment_unknown:  { color: '#6B7280', bg: '#F3F4F6', icon: AlertTriangle },
  paid:             { color: '#3B82F6', bg: '#DBEAFE', icon: Check },
  paid_held:        { color: '#8B5CF6', bg: '#EDE9FE', icon: Eye },
  payment_failed:   { color: '#DC2626', bg: '#FEE2E2', icon: X },
  processing:       { color: '#8B5CF6', bg: '#EDE9FE', icon: Settings },
  shipping:         { color: '#06B6D4', bg: '#CFFAFE', icon: Truck },
  completed:        { color: '#059669', bg: '#D1FAE5', icon: Check },
  cancelled:        { color: '#6B7280', bg: '#F3F4F6', icon: X },
  failed:           { color: '#DC2626', bg: '#FEE2E2', icon: X },
  returning:        { color: '#78716C', bg: '#F5F5F4', icon: Undo2 },
  returned:         { color: '#78716C', bg: '#F5F5F4', icon: Undo2 },
  delivery_failed:  { color: '#DC2626', bg: '#FEE2E2', icon: X },
  retry_pending:    { color: '#F59E0B', bg: '#FEF3C7', icon: RefreshCw },
  ready_to_ship:    { color: '#3B82F6', bg: '#DBEAFE', icon: Package },
  handover:         { color: '#06B6D4', bg: '#CFFAFE', icon: Handshake },
  in_transit:       { color: '#06B6D4', bg: '#CFFAFE', icon: Truck },
  delivered:        { color: '#059669', bg: '#D1FAE5', icon: Check },
  active:           { color: '#059669', bg: '#D1FAE5', icon: Check },
  blacklisted:      { color: '#DC2626', bg: '#FEE2E2', icon: X },
  customer:         { color: '#3B82F6', bg: '#DBEAFE', icon: CircleDot },
  shipper:          { color: '#06B6D4', bg: '#CFFAFE', icon: Truck },
  staff:            { color: '#8B5CF6', bg: '#EDE9FE', icon: Settings },
  admin:            { color: '#F97316', bg: '#FFEDD5', icon: Settings },

  // Issue statuses
  open:             { color: '#DC2626', bg: '#FEE2E2', icon: AlertTriangle },
  investigating:    { color: '#F59E0B', bg: '#FEF3C7', icon: Search },
  resolved:         { color: '#059669', bg: '#D1FAE5', icon: Check },
  ignored:          { color: '#6B7280', bg: '#F3F4F6', icon: Minus },

  // Issue severity
  low:              { color: '#059669', bg: '#D1FAE5', icon: CircleDot },
  medium:           { color: '#F59E0B', bg: '#FEF3C7', icon: CircleDot },
  high:             { color: '#F97316', bg: '#FFEDD5', icon: CircleDot },
  critical:         { color: '#DC2626', bg: '#FEE2E2', icon: AlertTriangle },

  // Issue types
  MANUAL_REVIEW:    { color: '#8B5CF6', bg: '#EDE9FE', icon: Eye },
  PAYMENT_ERROR:    { color: '#DC2626', bg: '#FEE2E2', icon: CreditCard },
  ORDER_FAILED:     { color: '#DC2626', bg: '#FEE2E2', icon: X },
  LOW_STOCK:        { color: '#F59E0B', bg: '#FEF3C7', icon: Package },
  DELIVERY_FAILED:  { color: '#DC2626', bg: '#FEE2E2', icon: Truck },

  // Refund statuses
  refund_pending:         { color: '#F59E0B', bg: '#FEF3C7', icon: RefreshCw },
  manual_review_required: { color: '#8B5CF6', bg: '#EDE9FE', icon: Eye },
  approved:               { color: '#059669', bg: '#D1FAE5', icon: Check },
  rejected:               { color: '#DC2626', bg: '#FEE2E2', icon: X },
  refunded:               { color: '#10B981', bg: '#D1FAE5', icon: Receipt },

  // Address change statuses
  requested:        { color: '#F59E0B', bg: '#FEF3C7', icon: MapPin },
  pending_approval: { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  rejected_timeout: { color: '#6B7280', bg: '#F3F4F6', icon: Timer },

  // Delivery events (uppercase payloads)
  FAILED:           { color: '#DC2626', bg: '#FEE2E2', icon: X },
  DELIVERED:        { color: '#059669', bg: '#D1FAE5', icon: Check },
  IN_TRANSIT:       { color: '#06B6D4', bg: '#CFFAFE', icon: Truck },
  HANDOVER:         { color: '#06B6D4', bg: '#CFFAFE', icon: Handshake },
  RETURNED:         { color: '#78716C', bg: '#F5F5F4', icon: Undo2 },
};

const DEFAULT = { color: '#6B7280', bg: '#F3F4F6', icon: CircleDot };

export default function StatusBadge({ value, size = 'md', showIcon = false, style = {} }) {
  if (!value) return null;
  
  const scheme = STATUS_COLORS[value] || DEFAULT;
  const displayText = value.replace(/_/g, ' ');

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '12px', iconSize: 12 },
    md: { padding: '3px 10px', fontSize: '13px', iconSize: 14 },
    lg: { padding: '4px 12px', fontSize: '14px', iconSize: 16 },
  };

  const currentSize = sizes[size] || sizes.md;
  const IconComponent = scheme.icon;

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
      {showIcon && IconComponent && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <IconComponent size={currentSize.iconSize} strokeWidth={2.5} />
        </span>
      )}
      <span>{displayText}</span>
    </span>
  );
}
