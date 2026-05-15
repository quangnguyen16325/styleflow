import { Children, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApiService from "../api";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import StatusBadge from "../components/ui/StatusBadge";
import ErrorMessage from "../components/ui/ErrorMessage";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  DollarSign,
  Package,
  Receipt,
  ShoppingCart,
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: null,
    orders: null,
    issues: null,
    refunds: null,
    revenue: null,
    actionOrders: [],
    lowStockProducts: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          ApiService.getProducts(),
          ApiService.getOrders(),
          ApiService.getIssues(),
          ApiService.getRefundRequests(),
        ]);

        if (!isActive) return;

        const [productsRes, ordersRes, issuesRes, refundsRes] = results;
        const products = productsRes.status === "fulfilled" ? productsRes.value : [];
        const orders = ordersRes.status === "fulfilled" ? ordersRes.value : [];
        const issues = issuesRes.status === "fulfilled" ? issuesRes.value : [];
        const refundRequests = refundsRes.status === "fulfilled" ? refundsRes.value : [];

        const lowStockCount = Array.isArray(products)
          ? products.filter((p) => p.availableQty < p.minStockLevel).length
          : 0;

        const pendingOrders = Array.isArray(orders)
          ? orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment").length
          : 0;

        const openIssues = Array.isArray(issues)
          ? issues.filter((i) => i.status === "open" || i.status === "investigating").length
          : 0;

        const pendingRefundRequests = Array.isArray(refundRequests)
          ? refundRequests.filter((r) => r.status === "pending").length
          : 0;

        const returningOrFailedOrders = Array.isArray(orders)
          ? orders.filter((o) => {
              const deliveryStatus = (o.deliveryStatus || o.delivery_status || "").toLowerCase();
              const deliveryFailCount = Number(o.deliveryFailCount ?? o.delivery_fail_count ?? 0);
              return (
                ["returning", "returned", "delivery_failed", "retry_pending"].includes(
                  deliveryStatus,
                ) || deliveryFailCount > 0
              );
            }).length
          : 0;

        const paidOrders = Array.isArray(orders)
          ? orders.filter((order) => isPaidOrder(order))
          : [];
        const now = new Date();
        const startOfToday = startOfLocalDay(now);
        const startOfSevenDays = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const paidOrdersToday = paidOrders.filter((order) =>
          isDateOnOrAfter(order.updatedAt || order.createdAt, startOfToday),
        );
        const paidOrdersSevenDays = paidOrders.filter((order) =>
          isDateOnOrAfter(order.updatedAt || order.createdAt, startOfSevenDays),
        );
        const revenueToday = sumOrderTotal(paidOrdersToday);
        const revenueSevenDays = sumOrderTotal(paidOrdersSevenDays);
        const ordersToday = Array.isArray(orders)
          ? orders.filter((order) => isDateOnOrAfter(order.createdAt, startOfToday)).length
          : 0;

        const actionOrders = Array.isArray(orders)
          ? orders
              .map((order) => ({ order, action: getOrderActionLabel(order) }))
              .filter((item) => item.action)
              .sort((a, b) => compareByLatestDate(a.order, b.order))
              .slice(0, 6)
          : [];

        const lowStockProducts = Array.isArray(products)
          ? products
              .filter((product) => Number(product.availableQty) < Number(product.minStockLevel))
              .sort(
                (a, b) =>
                  Number(a.availableQty) -
                  Number(a.minStockLevel) -
                  (Number(b.availableQty) - Number(b.minStockLevel)),
              )
              .slice(0, 6)
          : [];

        const recentActivity = buildRecentActivity({ orders, issues, refundRequests });

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
          revenue: {
            today: revenueToday,
            sevenDays: revenueSevenDays,
            ordersToday,
            paidOrdersSevenDays: paidOrdersSevenDays.length,
            averageOrderValue:
              paidOrdersSevenDays.length > 0 ? revenueSevenDays / paidOrdersSevenDays.length : 0,
          },
          actionOrders,
          lowStockProducts,
          recentActivity,
        });
      } catch (err) {
        if (isActive) {
          setError(err);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        key: "revenue",
        title: "Revenue 7d",
        total: formatCurrencyCompact(stats.revenue?.sevenDays ?? 0),
        sub: `${stats.revenue?.paidOrdersSevenDays ?? 0} paid orders`,
        subColor: "var(--color-text-muted)",
        link: "/orders?paymentStatus=paid",
        icon: DollarSign,
        accent: "#047857",
      },
      {
        key: "today",
        title: "Today",
        total: stats.revenue?.ordersToday ?? 0,
        sub: `${formatCurrencyCompact(stats.revenue?.today ?? 0)} revenue`,
        subColor: "var(--color-text-muted)",
        link: "/orders",
        icon: Clock,
        accent: "#7c3aed",
      },
      {
        key: "products",
        title: "Products",
        total: stats.products?.total ?? 0,
        sub: `${stats.products?.lowStock ?? 0} low stock`,
        subColor:
          (stats.products?.lowStock ?? 0) > 0 ? "var(--color-danger)" : "var(--color-text-muted)",
        link: "/products",
        icon: Package,
        accent: "#f6821f",
      },
      {
        key: "orders",
        title: "Orders",
        total: stats.orders?.total ?? 0,
        sub: `${stats.orders?.pending ?? 0} pending`,
        subColor:
          (stats.orders?.pending ?? 0) > 0 ? "var(--color-warning)" : "var(--color-text-muted)",
        link: "/orders",
        icon: ShoppingCart,
        accent: "#2563eb",
      },
      {
        key: "issues",
        title: "Issues",
        total: stats.issues?.total ?? 0,
        sub: `${stats.issues?.open ?? 0} open`,
        subColor: (stats.issues?.open ?? 0) > 0 ? "var(--color-danger)" : "var(--color-text-muted)",
        link: "/issues",
        icon: AlertTriangle,
        accent: "#c52828",
      },
      {
        key: "refunds",
        title: "Refunds",
        total: stats.refunds?.total ?? 0,
        sub: `${stats.refunds?.pending ?? 0} pending`,
        subColor:
          (stats.refunds?.pending ?? 0) > 0 ? "var(--color-warning)" : "var(--color-text-muted)",
        link: "/refund-requests",
        icon: Receipt,
        accent: "#b45309",
      },
    ],
    [stats],
  );

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--spacing-xs)",
              padding: "4px 8px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary-light)",
              color: "var(--color-primary-active)",
              fontSize: "11px",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "var(--spacing-sm)",
            }}
          >
            Live console
          </div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">
            Operational overview for inventory, orders, and customer issues.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        {cards.map((card) => (
          <div key={card.key} style={{ minWidth: 0 }}>
            <div
              className="card"
              style={{
                padding: "var(--spacing-lg)",
                cursor: "pointer",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                borderColor: expandedCard === card.key ? card.accent : "var(--color-border-light)",
                boxShadow:
                  expandedCard === card.key ? `0 14px 34px ${card.accent}18` : "var(--shadow-sm)",
                transition: "border-color 160ms ease, box-shadow 160ms ease",
              }}
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCard((current) => (current === card.key ? null : card.key))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExpandedCard((current) => (current === card.key ? null : card.key));
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--spacing-lg)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    background: `${card.accent}14`,
                    color: card.accent,
                  }}
                >
                  <card.icon size={18} />
                </div>
                <span
                  style={{
                    color: expandedCard === card.key ? card.accent : "var(--color-text-muted)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  {expandedCard === card.key ? "Hide" : "Details"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.055em",
                  marginBottom: "var(--spacing-xs)",
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-3xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-dark)",
                  marginBottom: "var(--spacing-xs)",
                  letterSpacing: "-0.04em",
                }}
              >
                {card.total}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  color: card.subColor,
                }}
              >
                {card.sub}
              </div>
              {expandedCard === card.key ? (
                <div
                  style={{
                    marginTop: "var(--spacing-md)",
                    paddingTop: "var(--spacing-md)",
                    borderTop: "1px solid var(--color-border-light)",
                    display: "grid",
                    gap: "8px",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {getExpandedCardDetails(card.key, stats).map((item) => (
                    <MetricLine key={item.label} label={item.label} value={item.value} compact />
                  ))}
                  <Link
                    to={card.link}
                    className="btn-secondary btn-sm"
                    style={{
                      justifyContent: "center",
                      textDecoration: "none",
                      marginTop: "var(--spacing-xs)",
                    }}
                  >
                    Open <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <DashboardPanel
          title="Orders Needing Action"
          subtitle="Payment, delivery, address change and return queues."
          emptyText="No urgent order queue right now."
        >
          {stats.actionOrders?.map(({ order, action }) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <DashboardListRow
                title={`Order #${order.id}`}
                description={`${action} · ${formatCurrency(order.totalAmount)}`}
                aside={<StatusBadge value={order.deliveryStatus || order.status} />}
              />
            </Link>
          ))}
        </DashboardPanel>

        <DashboardPanel
          title="Low Stock Products"
          subtitle="Products below their configured minimum level."
          emptyText="No product is below minimum stock."
        >
          {stats.lowStockProducts?.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <DashboardListRow
                title={product.name}
                description={`SKU ${product.sku} · Available ${product.availableQty}`}
                aside={
                  <span
                    style={{
                      color: "var(--color-danger)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Min {product.minStockLevel}
                  </span>
                }
              />
            </Link>
          ))}
        </DashboardPanel>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <DashboardPanel
          title="Recent Activity"
          subtitle="Latest orders, issues and return requests."
          emptyText="No recent activity found."
        >
          {stats.recentActivity?.map((activity) => (
            <Link
              key={activity.id}
              to={activity.to}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <DashboardListRow
                title={activity.title}
                description={`${activity.description} · ${formatRelativeDate(activity.date)}`}
                aside={<StatusBadge value={activity.status} />}
              />
            </Link>
          ))}
        </DashboardPanel>

        <div className="card" style={{ padding: "var(--spacing-lg)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-md)", color: "var(--color-dark)" }}>
            Revenue Snapshot
          </h3>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              marginTop: 3,
              marginBottom: "var(--spacing-md)",
            }}
          >
            Based on orders with confirmed payment status.
          </p>
          <MetricLine label="Today revenue" value={formatCurrency(stats.revenue?.today ?? 0)} />
          <MetricLine label="7-day revenue" value={formatCurrency(stats.revenue?.sevenDays ?? 0)} />
          <MetricLine
            label="7-day AOV"
            value={formatCurrency(stats.revenue?.averageOrderValue ?? 0)}
          />
          <MetricLine label="Orders today" value={String(stats.revenue?.ordersToday ?? 0)} />
        </div>
      </div>

      <div className="card" style={{ padding: "var(--spacing-lg)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--spacing-md)",
            marginBottom: "var(--spacing-md)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-md)", color: "var(--color-dark)" }}>
              Quick Actions
            </h3>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
                marginTop: 3,
              }}
            >
              Jump into the queues that need attention.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <Link
            to="/orders?status=pending"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Pending Orders
          </Link>
          <Link to="/issues?status=open" className="btn-danger" style={{ textDecoration: "none" }}>
            Open Issues
          </Link>
          <Link
            to="/refund-requests?status=pending"
            className="btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Pending Refunds
          </Link>
          <Link to="/products" className="btn-secondary" style={{ textDecoration: "none" }}>
            Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({ title, subtitle, emptyText, children }) {
  const hasChildren = Children.count(children) > 0;

  return (
    <div className="card" style={{ padding: "var(--spacing-lg)" }}>
      <h3 style={{ margin: 0, fontSize: "var(--font-size-md)", color: "var(--color-dark)" }}>
        {title}
      </h3>
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          marginTop: 3,
          marginBottom: "var(--spacing-md)",
        }}
      >
        {subtitle}
      </p>
      {hasChildren ? (
        <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>{children}</div>
      ) : (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            padding: "var(--spacing-md)",
            background: "var(--color-bg)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
}

function DashboardListRow({ title, description, aside }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--spacing-md)",
        alignItems: "center",
        padding: "var(--spacing-sm)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        background: "#fff",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "var(--color-dark)",
            fontWeight: "var(--font-weight-semibold)",
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </div>
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          {description}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>{aside}</div>
    </div>
  );
}

function MetricLine({ label, value, compact = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--spacing-md)",
        padding: compact ? "3px 0" : "10px 0",
        borderBottom: "1px solid var(--color-border-light)",
        fontSize: compact ? "var(--font-size-sm)" : undefined,
      }}
    >
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <strong style={{ color: "var(--color-dark)" }}>{value}</strong>
    </div>
  );
}

function getExpandedCardDetails(cardKey, stats) {
  const detailsByKey = {
    revenue: [
      { label: "Today", value: formatCurrency(stats.revenue?.today ?? 0) },
      { label: "7-day AOV", value: formatCurrency(stats.revenue?.averageOrderValue ?? 0) },
      { label: "Paid orders", value: String(stats.revenue?.paidOrdersSevenDays ?? 0) },
    ],
    today: [
      { label: "Orders today", value: String(stats.revenue?.ordersToday ?? 0) },
      { label: "Revenue today", value: formatCurrency(stats.revenue?.today ?? 0) },
      { label: "Pending orders", value: String(stats.orders?.pending ?? 0) },
    ],
    products: [
      { label: "Total products", value: String(stats.products?.total ?? 0) },
      { label: "Low stock", value: String(stats.products?.lowStock ?? 0) },
      { label: "Listed below", value: String(stats.lowStockProducts?.length ?? 0) },
    ],
    orders: [
      { label: "Total orders", value: String(stats.orders?.total ?? 0) },
      { label: "Pending", value: String(stats.orders?.pending ?? 0) },
      { label: "Action queue", value: String(stats.actionOrders?.length ?? 0) },
    ],
    issues: [
      { label: "Total issues", value: String(stats.issues?.total ?? 0) },
      { label: "Open", value: String(stats.issues?.open ?? 0) },
      { label: "Delivery risk", value: String(stats.deliveryRisk?.returningOrFailed ?? 0) },
    ],
    refunds: [
      { label: "Total returns", value: String(stats.refunds?.total ?? 0) },
      { label: "Pending", value: String(stats.refunds?.pending ?? 0) },
      { label: "Action queue", value: String(stats.actionOrders?.length ?? 0) },
    ],
  };

  return detailsByKey[cardKey] || [];
}

function getOrderActionLabel(order) {
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();
  const addressChangeStatus = String(order.addressChangeStatus || "").toLowerCase();
  const refundStatus = String(order.latestRefundRequest?.status || "").toLowerCase();

  if (addressChangeStatus === "requested") return "Address change requested";
  if (["payment_unknown", "payment_failed"].includes(paymentStatus)) return "Payment needs review";
  if (paymentStatus === "payment_pending") return "Waiting for payment";
  if (["retry_pending", "delivery_failed"].includes(deliveryStatus)) return "Delivery retry needed";
  if (deliveryStatus === "returning") return "Return in progress";
  if (refundStatus === "pending" || refundStatus === "manual_review_required") {
    return "Return request pending";
  }
  if (orderStatus === "pending") return "Order pending";
  if (["ready_to_ship", "handover"].includes(deliveryStatus)) return "Needs delivery handling";

  return "";
}

function buildRecentActivity({ orders, issues, refundRequests }) {
  const orderItems = Array.isArray(orders)
    ? orders.slice(0, 8).map((order) => ({
        id: `order-${order.id}`,
        title: `Order #${order.id}`,
        description: `${order.status || "unknown"} · ${formatCurrency(order.totalAmount)}`,
        status: order.deliveryStatus || order.status || "pending",
        date: order.updatedAt || order.createdAt,
        to: `/orders/${order.id}`,
      }))
    : [];

  const issueItems = Array.isArray(issues)
    ? issues.slice(0, 8).map((issue) => ({
        id: `issue-${issue.id}`,
        title: `Issue #${issue.id}`,
        description: `${issue.type || "issue"} · ${issue.severity || "unknown"}`,
        status: issue.status || "open",
        date: issue.updatedAt || issue.createdAt,
        to: `/issues/${issue.id}`,
      }))
    : [];

  const refundItems = Array.isArray(refundRequests)
    ? refundRequests.slice(0, 8).map((request) => ({
        id: `refund-${request.id}`,
        title: `Return #${request.id}`,
        description: `Order #${request.orderId}`,
        status: request.status || "pending",
        date: request.updatedAt || request.createdAt,
        to: `/refund-requests/${request.id}`,
      }))
    : [];

  return [...orderItems, ...issueItems, ...refundItems]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 8);
}

function isPaidOrder(order) {
  return ["paid", "paid_held"].includes(String(order.paymentStatus || "").toLowerCase());
}

function sumOrderTotal(orders) {
  return orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function isDateOnOrAfter(value, threshold) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= threshold;
}

function compareByLatestDate(a, b) {
  return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 đ";
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatCurrencyCompact(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "0 đ";

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M đ`;
  }

  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}K đ`;
  }

  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatRelativeDate(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("vi-VN");
}
