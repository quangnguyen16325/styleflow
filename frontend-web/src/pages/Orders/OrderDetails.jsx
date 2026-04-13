import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ApiService.getOrder(id)
      .then((data) => {
        setOrder(data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!order) return null;

  const badgeColor = 
    order.status === 'completed' ? '#2e7d32' : 
    order.status === 'cancelled' ? '#c62828' : '#e65100';
  const badgeBg = 
    order.status === 'completed' ? '#e8f5e9' : 
    order.status === 'cancelled' ? '#ffebee' : '#fff3e0';

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/orders" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>&larr; Back to Orders</Link>
      </div>

      {/* Order Main Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Order #{order.id}</h2>
        <span style={{ 
          padding: '6px 16px', 
          borderRadius: '16px', 
          fontSize: '14px', 
          fontWeight: 'bold',
          color: badgeColor,
          backgroundColor: badgeBg,
          textTransform: 'uppercase'
        }}>
          {order.status}
        </span>
      </div>

      <p style={{ color: '#5f6368', marginBottom: '30px' }}>
        Placed on <strong>{new Date(order.createdAt).toLocaleString()}</strong>
      </p>

      {/* Information Blocks (Commit 9 focus) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {/* Customer Block */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Customer Information</h3>
          {order.customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><strong>Name:</strong> {order.customer.fullName}</div>
              <div><strong>Phone:</strong> {order.customer.phone}</div>
              <div><strong>Email:</strong> {order.customer.email}</div>
            </div>
          ) : (
            <span style={{ color: '#999' }}>No customer data available</span>
          )}
        </div>

        {/* Shipping Block */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Shipping Address</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div><strong>Address:</strong> {order.shippingAddress || 'N/A'}</div>
            <div><strong>City:</strong> {order.city || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Items and Financial Summary */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0', marginBottom: '30px' }}>
        <h3 style={{ margin: 0, padding: '16px 24px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>Ordered Items</h3>
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
                <td style={{ fontWeight: '500' }}>{item.productId}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{item.priceAtPurchase.toLocaleString()} đ</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {(item.quantity * item.priceAtPurchase).toLocaleString()} đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '320px', backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Financial Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#5f6368' }}>
            <span>Subtotal (Items)</span>
            <span>{(order.totalAmount - (order.shippingFee || 0)).toLocaleString()} đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#5f6368' }}>
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
