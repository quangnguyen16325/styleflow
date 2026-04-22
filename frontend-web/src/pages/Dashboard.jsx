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
    let isActive = true;

    Promise.allSettled([
      ApiService.getProducts(),
      ApiService.getOrders(),
      ApiService.getIssues(),
      ApiService.getRefundRequests(),
    ]).then(([productsRes, ordersRes, issuesRes, refundsRes]) => {
      if (!isActive) return;
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
    }).finally(() => {
      if (!isActive) return;
      setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const cards = [
    {
      title: 'Products',
      total: stats.products?.total ?? 0,
      sub: `${stats.products?.lowStock ?? 0} low stock`,
      subColor: (stats.products?.lowStock ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
      link: '/products',
    },
    {
      title: 'Orders',
      total: stats.orders?.total ?? 0,
      sub: `${stats.orders?.pending ?? 0} pending`,
      subColor: (stats.orders?.pending ?? 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
      link: '/orders',
    },
    {
      title: 'Issues',
      total: stats.issues?.total ?? 0,
      sub: `${stats.issues?.open ?? 0} open`,
      subColor: (stats.issues?.open ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
      link: '/issues',
    },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--spacing-xs) 0', color: 'var(--color-dark)', fontSize: 'var(--font-size-2xl)' }}>Dashboard</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-sm)' }}>
        Overview of your store
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card" style={{ padding: 'var(--spacing-lg)', cursor: 'pointer' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-md)' }}>
                {card.title}
              </div>
              <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-dark)', marginBottom: 'var(--spacing-xs)' }}>
                {card.total}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: card.subColor }}>
                {card.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <Link to="/orders?status=pending" className="btn-primary" style={{ textDecoration: 'none' }}>
            Pending Orders
          </Link>
          <Link to="/issues?status=open" className="btn-danger" style={{ textDecoration: 'none' }}>
            Open Issues
          </Link>
          <Link to="/refund-requests?status=pending" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Pending Refunds
          </Link>
          <Link to="/products" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Inventory
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <Link
          to="/refund-requests?status=pending"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="card" style={{ padding: 'var(--spacing-lg)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Refund Requests</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-dark)' }}>
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
          <div className="card" style={{ padding: 'var(--spacing-lg)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Delivery Issues</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-dark)' }}>
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
