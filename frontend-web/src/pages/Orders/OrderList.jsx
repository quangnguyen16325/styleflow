import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ApiService from "../../api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

const ORDER_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipping", label: "Shipping" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

const PAYMENT_STATUSES = [
  { value: "ALL", label: "All Payment Statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "payment_unknown", label: "Payment Unknown" },
  { value: "paid", label: "Paid" },
  { value: "paid_held", label: "Paid Held" },
  { value: "payment_failed", label: "Payment Failed" },
  { value: "refund_pending", label: "Refund Pending" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_GATEWAYS = [
  { value: "ALL", label: "All Payment Methods" },
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOMO", label: "MoMo" },
];

const DELIVERY_STATUSES = [
  { value: "ALL", label: "All Delivery Statuses" },
  { value: "pending", label: "Pending" },
  { value: "ready_to_ship", label: "Ready to Ship" },
  { value: "handover", label: "Handover" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivery_failed", label: "Delivery Failed" },
  { value: "retry_pending", label: "Retry Pending" },
  { value: "returning", label: "Returning" },
  { value: "returned", label: "Returned" },
  { value: "delivered", label: "Delivered" },
];

export default function OrderList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedStatuses = ORDER_STATUSES.map((status) => status.value);
  const allowedPaymentStatuses = PAYMENT_STATUSES.map((status) => status.value);
  const allowedPaymentGateways = PAYMENT_GATEWAYS.map((gateway) => gateway.value);
  const allowedDeliveryStatuses = DELIVERY_STATUSES.map((status) => status.value);
  const statusFromQuery = normalizeFilterValue(searchParams.get("status"), allowedStatuses);
  const paymentStatusFilter = normalizeFilterValue(
    searchParams.get("paymentStatus"),
    allowedPaymentStatuses,
  );
  const paymentGatewayFilter = normalizeFilterValue(
    searchParams.get("paymentGateway"),
    allowedPaymentGateways,
    { preserveCase: true },
  );
  const deliveryStatusFilter = normalizeFilterValue(
    searchParams.get("deliveryStatus"),
    allowedDeliveryStatuses,
  );
  const statusFilter = statusFromQuery;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [statusFilter, refreshKey]);

  const updateFilterParam = useCallback(
    (key, nextValue) => {
      setLoading(true);
      setError(null);

      const nextParams = new URLSearchParams(searchParams);
      if (nextValue === "ALL") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, nextValue);
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((current) => current + 1);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = (() => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          order.id.toString().includes(term) ||
          (order.customer?.fullName || "").toLowerCase().includes(term) ||
          (order.customer?.phone || "").includes(term) ||
          (order.customer?.email || "").toLowerCase().includes(term)
        );
      })();

      const matchesPaymentStatus =
        paymentStatusFilter === "ALL" ||
        String(order.paymentStatus || "").toLowerCase() === paymentStatusFilter;
      const matchesPaymentGateway =
        paymentGatewayFilter === "ALL" ||
        String(order.paymentGateway || "").toUpperCase() === paymentGatewayFilter;
      const matchesDeliveryStatus =
        deliveryStatusFilter === "ALL" ||
        String(order.deliveryStatus || "").toLowerCase() === deliveryStatusFilter;

      return (
        matchesSearch && matchesPaymentStatus && matchesPaymentGateway && matchesDeliveryStatus
      );
    });
  }, [orders, searchTerm, paymentStatusFilter, paymentGatewayFilter, deliveryStatusFilter]);

  const totalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  }, [filteredOrders]);

  if (loading) return <LoadingSpinner message="Loading orders..." />;
  if (error) return <ErrorMessage error={error} onRetry={handleRetry} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Orders</h2>
          <p className="page-subtitle">
            {filteredOrders.length} of {orders.length} orders · Total: {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          marginBottom: "var(--spacing-lg)",
          padding: "var(--spacing-md)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--spacing-sm)",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by ID, name, phone, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          aria-label="Search orders by ID, name, phone, or email"
        />
        <select
          value={statusFilter}
          onChange={(e) => updateFilterParam("status", e.target.value)}
          className="form-select"
          aria-label="Filter orders by status"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => updateFilterParam("paymentStatus", e.target.value)}
          className="form-select"
          aria-label="Filter orders by payment status"
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={paymentGatewayFilter}
          onChange={(e) => updateFilterParam("paymentGateway", e.target.value)}
          className="form-select"
          aria-label="Filter orders by payment method"
        >
          {PAYMENT_GATEWAYS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={deliveryStatusFilter}
          onChange={(e) => updateFilterParam("deliveryStatus", e.target.value)}
          className="form-select"
          aria-label="Filter orders by delivery status"
        >
          {DELIVERY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState title="No Orders Yet" description="There are no orders in the system." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No matches found"
          description="No orders match your search or filter criteria."
        />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Total</th>
                <th>Customer</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: "var(--font-weight-bold)" }}>#{order.id}</td>
                  <td>
                    <StatusBadge value={order.status} showIcon />
                    {order.addressChangeStatus && order.addressChangeStatus !== "none" ? (
                      <div style={{ marginTop: "var(--spacing-xs)" }}>
                        <StatusBadge value={order.addressChangeStatus} size="sm" showIcon />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}
                    >
                      <StatusBadge value={order.paymentStatus || "unpaid"} size="sm" showIcon />
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                        }}
                      >
                        {formatPaymentGateway(order.paymentGateway)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge value={order.deliveryStatus || "pending"} size="sm" showIcon />
                  </td>
                  <td>
                    <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div
                      style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}
                    >
                      Ship {formatCurrency(order.shippingFee)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: "var(--font-weight-medium)" }}>
                      {order.customer?.fullName || "—"}
                    </div>
                    <div
                      style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}
                    >
                      {order.customer?.phone || "—"}
                    </div>
                  </td>
                  <td style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <Link to={`/orders/${order.id}`} className="link">
                      View
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

function normalizeFilterValue(value, allowedValues, options = {}) {
  if (!value) {
    return "ALL";
  }

  const normalized = options.preserveCase ? value.trim().toUpperCase() : value.trim().toLowerCase();
  return allowedValues.includes(normalized) ? normalized : "ALL";
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatPaymentGateway(value) {
  const gateway = String(value || "").toUpperCase();
  if (gateway === "COD") return "Cash on delivery";
  if (gateway === "BANK_TRANSFER") return "Bank transfer";
  if (gateway === "MOMO") return "MoMo";
  return value || "—";
}
