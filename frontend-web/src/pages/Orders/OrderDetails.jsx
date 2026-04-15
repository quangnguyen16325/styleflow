import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StatusBadge from '../../components/ui/StatusBadge';

const ALL_STATUSES = [
  'pending', 'awaiting_payment', 'paid', 'processing',
  'shipping', 'completed', 'cancelled', 'failed'
];

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    ApiService.getOrder(id)
      .then((data) => {
        setOrder(data);
        setNewStatus(data.status);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
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
  };

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!order) return null;

  const shipping = order.shipping || {};

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/orders" className="link">&larr; Back to Orders</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Order #{order.id}</h2>
        <StatusBadge value={order.status} style={{ fontSize: '14px', padding: '6px 16px' }} />
      </div>
      <p style={{ color: '#5f6368', marginBottom: '24px', fontSize: '14px' }}>
        Placed on <strong>{new Date(order.createdAt).toLocaleString()}</strong>
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <> &middot; Updated <strong>{new Date(order.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      {/* Status Update Action */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#202124' }}>Update Order Status</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '13px', color: '#5f6368' }}>Current status selected</span>
          )}
        </div>
        {updateError && <div style={{ marginTop: '10px' }}><ErrorMessage error={updateError} /></div>}
        {updateSuccess && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', fontSize: '14px' }}>
            ✓ Status updated successfully
          </div>
        )}
      </div>

      {/* Information Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Customer Block */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>Customer Information</h3>
          {order.customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div><strong>Name:</strong> {order.customer.fullName}</div>
              <div><strong>Phone:</strong> {order.customer.phone}</div>
              <div><strong>Email:</strong> {order.customer.email}</div>
            </div>
          ) : (
            <span style={{ color: '#999' }}>No customer data available</span>
          )}
        </div>

        {/* Shipping Snapshot Block */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>Shipping Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div><strong>Receiver:</strong> {shipping.receiverName || '—'}</div>
            <div><strong>Phone:</strong> {shipping.receiverPhone || '—'}</div>
            <div><strong>Address:</strong> {shipping.addressLine || '—'}</div>
            <div><strong>Ward:</strong> {shipping.ward || '—'}</div>
            <div><strong>District:</strong> {shipping.district || '—'}</div>
            <div><strong>City:</strong> {shipping.city || '—'}</div>
            <div><strong>Country:</strong> {shipping.country || '—'}</div>
            <div><strong>Postal Code:</strong> {shipping.postalCode || '—'}</div>
            {shipping.fullAddress && (
              <div style={{ marginTop: '6px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', color: '#5f6368', fontSize: '13px' }}>
                📍 {shipping.fullAddress}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, padding: '16px 24px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '15px' }}>Ordered Items</h3>
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

      {/* Financial Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="card" style={{ width: '340px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>Financial Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#5f6368', fontSize: '14px' }}>
            <span>Subtotal (Items)</span>
            <span>{((order.totalAmount || 0) - (order.shippingFee || 0)).toLocaleString()} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#5f6368', fontSize: '14px' }}>
            <span>Shipping Fee</span>
            <span>{(order.shippingFee || 0).toLocaleString()} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '2px solid #e0e0e0', fontSize: '18px' }}>
            <span style={{ fontWeight: 'bold' }}>Total Amount</span>
            <span style={{ color: '#1a73e8', fontWeight: 'bold' }}>{(order.totalAmount || 0).toLocaleString()} đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
