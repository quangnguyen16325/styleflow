import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: null,
    orders: null,
    issues: null,
    refunds: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ApiService.getProducts(),
      ApiService.getOrders(),
      ApiService.getIssues(),
      ApiService.getRefundRequests(),
    ]).then(([productsRes, ordersRes, issuesRes, refundsRes]) => {
      const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
      const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
      const issues = issuesRes.status === 'fulfilled' ? issuesRes.value : [];
      const refundRequests = refundsRes.status === 'fulfilled' ? refundsRes.value : [];

      const lowStockCount = Array.isArray(products)
        ? products.filter(p => p.availableQty < p.minStockLevel).length
        : 0;

      const pendingOrders = Array.isArray(orders)
        ? orders.filter(o => o.status === 'pending' || o.status === 'awaiting_payment').length
        : 0;

      const openIssues = Array.isArray(issues)
        ? issues.filter(i => i.status === 'open' || i.status === 'investigating').length
        : 0;

      const pendingRefundRequests = Array.isArray(refundRequests)
        ? refundRequests.filter((r) => r.status === 'pending').length
        : 0;

      const returningOrFailedOrders = Array.isArray(orders)
        ? orders.filter((o) => {
          const deliveryStatus = (o.deliveryStatus || o.delivery_status || '').toLowerCase();
          const deliveryFailCount = Number(o.deliveryFailCount ?? o.delivery_fail_count ?? 0);
          return (
            ['returning', 'returned', 'delivery_failed', 'retry_pending'].includes(deliveryStatus) ||
            deliveryFailCount > 0
          );
        }).length
        : 0;

      setStats({
        products: {
          total: Array.isArray(products) ? products.length : 0,
          lowStock: lowStockCount,
        },
        orders: {
          total: Array.isArray(orders) ? orders.length : 0,
          pending: pendingOrders,
        },
        issues: {
          total: Array.isArray(issues) ? issues.length : 0,
          open: openIssues,
        },
        refunds: {
          total: Array.isArray(refundRequests) ? refundRequests.length : 0,
          pending: pendingRefundRequests,
        },
        deliveryRisk: {
          returningOrFailed: returningOrFailedOrders,
        },
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const cards = [
    {
      title: 'Products',
      icon: '📦',
      total: stats.products?.total ?? 0,
      sub: `${stats.products?.lowStock ?? 0} low stock`,
      subColor: (stats.products?.lowStock ?? 0) > 0 ? '#c62828' : '#2e7d32',
      link: '/products',
    },
    {
      title: 'Orders',
      icon: '🛒',
      total: stats.orders?.total ?? 0,
      sub: `${stats.orders?.pending ?? 0} pending`,
      subColor: (stats.orders?.pending ?? 0) > 0 ? '#e65100' : '#2e7d32',
      link: '/orders',
    },
    {
      title: 'Issues',
      icon: '⚠️',
      total: stats.issues?.total ?? 0,
      sub: `${stats.issues?.open ?? 0} open`,
      subColor: (stats.issues?.open ?? 0) > 0 ? '#c62828' : '#2e7d32',
      link: '/issues',
    },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 8px 0', color: '#202124' }}>Dashboard</h2>
      <p style={{ color: '#5f6368', marginBottom: '28px', fontSize: '14px' }}>
        Welcome back! Here's an overview of your store.
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card" style={{ padding: '24px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {card.title}
                </span>
                <span style={{ fontSize: '28px' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#202124', marginBottom: '6px' }}>
                {card.total}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: card.subColor }}>
                {card.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#202124' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/orders?status=pending" className="btn-primary" style={{ textDecoration: 'none' }}>
            View Pending Orders
          </Link>
          <Link to="/issues?status=open" className="btn-primary" style={{ textDecoration: 'none', background: '#c62828' }}>
            View Open Issues
          </Link>
          <Link to="/refund-requests?status=pending" className="btn-primary" style={{ textDecoration: 'none', background: '#6a1b9a' }}>
            Review Pending Refunds
          </Link>
          <Link to="/orders?status=failed" className="btn-primary" style={{ textDecoration: 'none', background: '#5d4037' }}>
            Check Failed Orders
          </Link>
          <Link to="/products" className="btn-primary" style={{ textDecoration: 'none', background: '#2e7d32' }}>
            Check Inventory
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: '20px' }}>
        <Link
          to="/refund-requests?status=pending"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="card" style={{ padding: '20px', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#202124' }}>Refund Requests Pending</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: '#6a1b9a' }}>
                {stats.refunds?.pending ?? 0}
              </div>
              <StatusBadge value="pending" />
            </div>
          </div>
        </Link>

        <Link
          to="/orders"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="card" style={{ padding: '20px', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#202124' }}>Orders Returning / Failed Delivery</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: '#5d4037' }}>
                {stats.deliveryRisk?.returningOrFailed ?? 0}
              </div>
              <StatusBadge value="returned" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
