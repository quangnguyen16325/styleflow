import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states (Commit 8 requirements)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    ApiService.getOrders()
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner message="Loading orders..." />;
  if (error) return <ErrorMessage error={error} />;

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    const matchesId = searchTerm === '' || order.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesId && matchesStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Order Management</h2>
      </div>
      
      {/* Search & Filter Toolbar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <input 
          type="text" 
          placeholder="Search by Order ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '250px' }}
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '180px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState title="No Orders Yet" description="There are no orders in the system." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="No matches found" description="No orders match your filter criteria." />
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Customer Name</th>
                <th>Customer Phone</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const badgeColor = 
                  order.status === 'completed' ? '#2e7d32' : 
                  order.status === 'cancelled' ? '#c62828' : '#e65100';
                const badgeBg = 
                  order.status === 'completed' ? '#e8f5e9' : 
                  order.status === 'cancelled' ? '#ffebee' : '#fff3e0';

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 'bold' }}>#{order.id}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        color: badgeColor,
                        backgroundColor: badgeBg,
                        textTransform: 'capitalize'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.totalAmount.toLocaleString()} đ</td>
                    <td>{order.customer?.fullName || '-'}</td>
                    <td>{order.customer?.phone || '-'}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/orders/${order.id}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
