import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const ALL_STATUSES = [
  'pending', 'awaiting_payment', 'paid', 'processing',
  'shipping', 'completed', 'cancelled', 'failed',
];

const ADDRESS_CHANGE_DECISIONS = [
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'rejected_timeout', label: 'Reject (Timeout)' },
];

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [deliveryEventsLoading, setDeliveryEventsLoading] = useState(true);
  const [deliveryEventsError, setDeliveryEventsError] = useState(null);

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Address change decision state
  const [addressDecision, setAddressDecision] = useState('approved');
  const [approvedShippingFee, setApprovedShippingFee] = useState('');
  const [addressDecisionLoading, setAddressDecisionLoading] = useState(false);
  const [addressDecisionError, setAddressDecisionError] = useState(null);
  const [addressDecisionSuccess, setAddressDecisionSuccess] = useState(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setDeliveryEventsLoading(true);
    setError(null);
    setDeliveryEventsError(null);

    Promise.allSettled([
      ApiService.getOrder(id),
      ApiService.getOrderDeliveryEvents(id),
    ])
      .then(([orderRes, deliveryEventsRes]) => {
        if (!isActive) return;

        if (orderRes.status === 'fulfilled') {
          setOrder(orderRes.value);
          setNewStatus(orderRes.value.status);
        } else {
          setError(orderRes.reason);
        }

        if (deliveryEventsRes.status === 'fulfilled') {
          setDeliveryEvents(Array.isArray(deliveryEventsRes.value) ? deliveryEventsRes.value : []);
        } else {
          setDeliveryEvents([]);
          setDeliveryEventsError(deliveryEventsRes.reason);
        }
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
        setDeliveryEventsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const handleUpdateStatus = useCallback(async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    try {
      const updated = await ApiService.updateOrderStatus(id, newStatus);
      setOrder(updated);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err);
    } finally {
      setUpdating(false);
    }
  }, [id, newStatus, order]);

  const handleAddressChangeDecision = useCallback(async () => {
    setAddressDecisionLoading(true);
    setAddressDecisionError(null);
    setAddressDecisionSuccess(null);

    try {
      const response = await ApiService.submitAddressChangeDecision(
        id,
        addressDecision,
        addressDecision === 'approved' ? approvedShippingFee : null,
      );
      setAddressDecisionSuccess(response?.action || addressDecision);

      const updatedOrder = await ApiService.getOrder(id);
      setOrder(updatedOrder);
    } catch (err) {
      setAddressDecisionError(err);
    } finally {
      setAddressDecisionLoading(false);
    }
  }, [id, addressDecision, approvedShippingFee]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error) return <ErrorMessage error={error} onRetry={handleRetry} />;
  if (!order) return null;

  const shipping = order.shipping || {};
  const deliveryStatus = order.deliveryStatus || order.delivery_status || null;
  const deliveryFailCount = Number(order.deliveryFailCount ?? order.delivery_fail_count ?? NaN);
  const hasDeliveryFailCount = Number.isFinite(deliveryFailCount);

  const addressChangeStatus = String(
    order.addressChangeStatus ?? order.address_change_status ?? 'none',
  ).toLowerCase();
  const addressChangePayload = order.addressChangePayload ?? order.address_change_payload;
  const canReviewAddressChange = ['requested', 'pending_approval'].includes(addressChangeStatus);
  const hasAddressPayload = !!addressChangePayload && typeof addressChangePayload === 'object';

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/orders" className="link">&larr; Back to Orders</Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <h2>Order #{order.id}</h2>
        <StatusBadge value={order.status} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }} />
      </div>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-sm)' }}>
        Placed on <strong>{new Date(order.createdAt).toLocaleString()}</strong>
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <> &middot; Updated <strong>{new Date(order.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      {(deliveryStatus || hasDeliveryFailCount) && (
        <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Delivery Signals</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
            {deliveryStatus && (
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                <strong style={{ fontSize: 'var(--font-size-sm)' }}>Delivery Status:</strong>
                <StatusBadge value={deliveryStatus} />
              </div>
            )}
            {hasDeliveryFailCount && (
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <strong>Delivery Fail Count:</strong> {deliveryFailCount}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Update Action */}
      <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Update Order Status</h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select"
            style={{ width: '220px' }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleUpdateStatus}
            disabled={updating || newStatus === order.status}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
          {newStatus === order.status && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Current status selected</span>
          )}
        </div>
        {updateError && <div style={{ marginTop: 'var(--spacing-sm)' }}><ErrorMessage error={updateError} /></div>}
        {updateSuccess && (
          <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
            Status updated successfully
          </div>
        )}
      </div>

      {(addressChangeStatus !== 'none' || hasAddressPayload) && (
        <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Address Change Approval</h3>
          <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Current Request Status:</span>
            <StatusBadge value={addressChangeStatus} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)' }}>
              <h4 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-dark)' }}>Current Shipping Snapshot</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                <div><strong>Receiver:</strong> {shipping.receiverName || '—'}</div>
                <div><strong>Phone:</strong> {shipping.receiverPhone || '—'}</div>
                <div><strong>Address:</strong> {shipping.fullAddress || shipping.addressLine || '—'}</div>
                <div><strong>Shipping Fee:</strong> {(order.shippingFee || 0).toLocaleString()} đ</div>
              </div>
            </div>

            <div style={{ padding: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)' }}>
              <h4 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-dark)' }}>Requested Payload</h4>
              {!hasAddressPayload ? (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  Requested payload is not available from API response.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                  <div><strong>Receiver:</strong> {addressChangePayload.receiverName || '—'}</div>
                  <div><strong>Phone:</strong> {addressChangePayload.receiverPhone || '—'}</div>
                  <div><strong>Address:</strong> {addressChangePayload.fullAddress || addressChangePayload.addressLine || '—'}</div>
                  <div><strong>Requested Shipping Fee:</strong> {formatCurrency(addressChangePayload.requestedShippingFee)}</div>
                  <div><strong>Current Shipping Fee:</strong> {formatCurrency(addressChangePayload.currentShippingFee)}</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={addressDecision}
              onChange={(e) => setAddressDecision(e.target.value)}
              className="form-select"
              style={{ width: '220px' }}
              disabled={!canReviewAddressChange || addressDecisionLoading}
            >
              {ADDRESS_CHANGE_DECISIONS.map((decisionItem) => (
                <option key={decisionItem.value} value={decisionItem.value}>
                  {decisionItem.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={approvedShippingFee}
              onChange={(e) => setApprovedShippingFee(e.target.value)}
              placeholder="Approved shipping fee (optional)"
              className="form-input"
              style={{ width: '240px' }}
              disabled={!canReviewAddressChange || addressDecisionLoading || addressDecision !== 'approved'}
            />
            <button
              className="btn-primary"
              onClick={handleAddressChangeDecision}
              disabled={!canReviewAddressChange || addressDecisionLoading}
            >
              {addressDecisionLoading ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>

          {!canReviewAddressChange && (
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              This order does not have a pending address change request.
            </div>
          )}
          {addressDecisionError && <div style={{ marginTop: 'var(--spacing-sm)' }}><ErrorMessage error={addressDecisionError} /></div>}
          {addressDecisionSuccess && (
            <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              Address change decision submitted ({addressDecisionSuccess})
            </div>
          )}
        </div>
      )}

      {/* Information Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        {/* Customer Block */}
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Customer Information</h3>
          {order.customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
              <div><strong>Name:</strong> {order.customer.fullName}</div>
              <div><strong>Phone:</strong> {order.customer.phone}</div>
              <div><strong>Email:</strong> {order.customer.email}</div>
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>No customer data available</span>
          )}
        </div>

        {/* Shipping Snapshot Block */}
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Shipping Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
            <div><strong>Receiver:</strong> {shipping.receiverName || '—'}</div>
            <div><strong>Phone:</strong> {shipping.receiverPhone || '—'}</div>
            <div><strong>Address:</strong> {shipping.addressLine || '—'}</div>
            <div><strong>Ward:</strong> {shipping.ward || '—'}</div>
            <div><strong>District:</strong> {shipping.district || '—'}</div>
            <div><strong>City:</strong> {shipping.city || '—'}</div>
            <div><strong>Country:</strong> {shipping.country || '—'}</div>
            <div><strong>Postal Code:</strong> {shipping.postalCode || '—'}</div>
            {shipping.fullAddress && (
              <div style={{ marginTop: 'var(--spacing-xs)', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {shipping.fullAddress}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: 0, padding: 'var(--spacing-lg) var(--spacing-xl)', backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Ordered Items</h3>
        <table>
          <thead>
            <tr>
              <th>Product ID</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => (
              <tr key={index}>
                <td>
                  <Link to={`/products/${item.productId}`} className="link">
                    Product #{item.productId}
                  </Link>
                </td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{(item.priceAtPurchase || 0).toLocaleString()} đ</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {(item.quantity * (item.priceAtPurchase || 0)).toLocaleString()} đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: 0, padding: 'var(--spacing-lg) var(--spacing-xl)', backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
          Delivery Events
        </h3>
        {deliveryEventsLoading ? (
          <LoadingSpinner message="Loading delivery events..." />
        ) : deliveryEventsError ? (
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <ErrorMessage error={deliveryEventsError} />
          </div>
        ) : deliveryEvents.length === 0 ? (
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <EmptyState
              title="No Delivery Events"
              description="This order does not have delivery callback events yet."
            />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Status</th>
                <th>Reason</th>
                <th>External Event ID</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {deliveryEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.partner || '—'}</td>
                  <td><StatusBadge value={event.status} /></td>
                  <td>{event.reason || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    {event.externalEventId || '—'}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    {event.createdAt ? new Date(event.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Financial Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="card" style={{ width: '340px', padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Financial Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            <span>Subtotal (Items)</span>
            <span>{((order.totalAmount || 0) - (order.shippingFee || 0)).toLocaleString()} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            <span>Shipping Fee</span>
            <span>{(order.shippingFee || 0).toLocaleString()} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--spacing-md)', borderTop: '2px solid var(--color-border)', fontSize: 'var(--font-size-lg)' }}>
            <span style={{ fontWeight: 'var(--font-weight-bold)' }}>Total Amount</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-bold)' }}>{(order.totalAmount || 0).toLocaleString()} đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }

  return `${amount.toLocaleString()} đ`;
}
