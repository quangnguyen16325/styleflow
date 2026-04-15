import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

const ORDER_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isActive = true;

    ApiService.getOrders(statusFilter)
      .then((data) => {
        if (!isActive) return;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [statusFilter]);

  // Client-side search within server-filtered results
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(term) ||
      (order.customer?.fullName || '').toLowerCase().includes(term) ||
      (order.customer?.phone || '').includes(term)
    );
  });

  if (loading) return <LoadingSpinner message="Loading orders..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Order Management</h2>
        <span style={{ fontSize: '13px', color: '#5f6368' }}>{filteredOrders.length} order(s)</span>
      </div>

      {/* Filter Toolbar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by ID, name, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ width: '260px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setError(null);
            setStatusFilter(e.target.value);
          }}
          className="form-select"
          style={{ width: '200px' }}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState title="No Orders Yet" description="There are no orders in the system." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="No matches found" description="No orders match your search or filter criteria." />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Shipping Fee</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 'bold' }}>#{order.id}</td>
                  <td><StatusBadge value={order.status} /></td>
                  <td>{(order.totalAmount || 0).toLocaleString()} đ</td>
                  <td>{(order.shippingFee || 0).toLocaleString()} đ</td>
                  <td>{order.customer?.fullName || '—'}</td>
                  <td>{order.customer?.phone || '—'}</td>
                  <td style={{ fontSize: '13px', color: '#5f6368' }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <Link to={`/orders/${order.id}`} className="link">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
