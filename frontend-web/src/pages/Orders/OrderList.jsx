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

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
  { value: "ALL", label: "All rows" },
];

const ACTION_QUEUE_FILTERS = [
  { value: "ALL", label: "All action queues" },
  { value: "needs_action", label: "Needs action" },
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
  const actionQueueFilter = normalizeFilterValue(
    searchParams.get("actionQueue"),
    ACTION_QUEUE_FILTERS.map((filter) => filter.value),
  );
  const searchTerm = searchParams.get("q") || "";
  const pageSize = normalizePageSize(searchParams.get("pageSize"));
  const currentPage = normalizePage(searchParams.get("page"));
  const statusFilter = statusFromQuery;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      setError(null);
      if (key === "status") {
        setLoading(true);
      }

      const nextParams = new URLSearchParams(searchParams);
      if (nextValue === "ALL") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, nextValue);
      }
      nextParams.delete("page");
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const updatePageSizeParam = useCallback(
    (nextValue) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextValue === "25") {
        nextParams.delete("pageSize");
      } else {
        nextParams.set("pageSize", nextValue);
      }
      nextParams.delete("page");
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const updatePageParam = useCallback(
    (nextPage) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextPage <= 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(nextPage));
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const updateSearchParam = useCallback(
    (nextValue) => {
      const nextParams = new URLSearchParams(searchParams);
      const normalizedValue = nextValue.trimStart();
      if (normalizedValue) {
        nextParams.set("q", normalizedValue);
      } else {
        nextParams.delete("q");
      }
      nextParams.delete("page");
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
        const term = normalizeSearchText(searchTerm);
        if (!term) return true;

        const compactTerm = term.replace(/\s+/g, "");
        const digitTerm = term.replace(/\D/g, "");
        const orderId = String(order.id || "");
        const orderAliases = [orderId, `#${orderId}`, `ord${orderId}`, `order${orderId}`];
        const searchableValues = [
          ...orderAliases,
          order.status,
          order.paymentStatus,
          order.paymentGateway,
          order.deliveryStatus,
          order.transactionRef,
          order.incidentId,
          order.customer?.fullName,
          order.customer?.phone,
          order.customer?.email,
          order.assignedShipper?.fullName,
          order.assignedShipper?.phone,
          order.assignedShipper?.email,
          order.shipping?.receiverName,
          order.shipping?.receiverPhone,
          order.shipping?.fullAddress,
          order.shippingAddress,
          order.city,
        ];

        return searchableValues.some((value) => {
          const normalizedValue = normalizeSearchText(value);
          if (!normalizedValue) return false;

          const compactValue = normalizedValue.replace(/\s+/g, "");
          if (normalizedValue.includes(term) || compactValue.includes(compactTerm)) {
            return true;
          }

          return digitTerm && normalizedValue.replace(/\D/g, "").includes(digitTerm);
        });
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
      const matchesActionQueue =
        actionQueueFilter === "ALL" || matchesOrderActionQueue(order, actionQueueFilter);

      return (
        matchesSearch &&
        matchesPaymentStatus &&
        matchesPaymentGateway &&
        matchesDeliveryStatus &&
        matchesActionQueue
      );
    });
  }, [
    orders,
    searchTerm,
    paymentStatusFilter,
    paymentGatewayFilter,
    deliveryStatusFilter,
    actionQueueFilter,
  ]);

  const totalAmount = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  }, [filteredOrders]);

  const pagination = useMemo(() => {
    if (pageSize === "ALL") {
      return {
        page: 1,
        totalPages: 1,
        startIndex: filteredOrders.length > 0 ? 1 : 0,
        endIndex: filteredOrders.length,
        rows: filteredOrders,
      };
    }

    const numericPageSize = Number(pageSize);
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / numericPageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startOffset = (safePage - 1) * numericPageSize;
    const rows = filteredOrders.slice(startOffset, startOffset + numericPageSize);

    return {
      page: safePage,
      totalPages,
      startIndex: filteredOrders.length > 0 ? startOffset + 1 : 0,
      endIndex: Math.min(startOffset + numericPageSize, filteredOrders.length),
      rows,
    };
  }, [filteredOrders, pageSize, currentPage]);

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
          onChange={(e) => updateSearchParam(e.target.value)}
          className="form-input"
          aria-label="Search orders by ID, name, phone, email, address, or transaction"
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
        <select
          value={actionQueueFilter}
          onChange={(e) => updateFilterParam("actionQueue", e.target.value)}
          className="form-select"
          aria-label="Filter orders by action queue"
        >
          {ACTION_QUEUE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <select
          value={pageSize}
          onChange={(e) => updatePageSizeParam(e.target.value)}
          className="form-select"
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
          <div style={{ overflowX: "auto" }}>
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
                  <th>Customer Requests</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.rows.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: "var(--font-weight-bold)" }}>#{order.id}</td>
                    <td>
                      <StatusBadge value={order.status} showIcon />
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--spacing-xs)",
                        }}
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
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                        }}
                      >
                        Ship {formatCurrency(order.shippingFee)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "var(--font-weight-medium)" }}>
                        {order.customer?.fullName || "—"}
                      </div>
                      <div
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                        }}
                      >
                        {order.customer?.phone || "—"}
                      </div>
                    </td>
                    <td
                      style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}
                    >
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <CustomerRequestsCell order={order} />
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--spacing-md)",
              padding: "var(--spacing-md)",
              borderTop: "1px solid var(--color-border)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              Showing {pagination.startIndex}-{pagination.endIndex} of {filteredOrders.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => updatePageParam(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => updatePageParam(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
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

function normalizePageSize(value) {
  const normalizedValue = String(value || "25")
    .trim()
    .toUpperCase();
  return PAGE_SIZE_OPTIONS.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "25";
}

function normalizePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function shouldShowAddressChangeBadge(value) {
  const status = String(value || "").toLowerCase();
  return status && status !== "none" && status !== "approved";
}

function CustomerRequestsCell({ order }) {
  const requests = getCustomerRequests(order);

  if (requests.length === 0) {
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>—</span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
      {requests.map((request) => (
        <div key={request.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <StatusBadge value={request.status} size="sm" showIcon />
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
            {request.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function getCustomerRequests(order) {
  const requests = [];
  if (shouldShowAddressChangeBadge(order.addressChangeStatus)) {
    requests.push({
      key: "address-change",
      status: order.addressChangeStatus,
      label: getAddressChangeMeta(order.addressChangeStatus),
    });
  }

  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();
  if (refundStatus && refundStatus !== "none") {
    requests.push({
      key: "refund-request",
      status: refundStatus,
      label: getRefundRequestMeta(refundStatus),
    });
  }

  return requests;
}

function getAddressChangeMeta(value) {
  const status = String(value || "").toLowerCase();
  if (status === "requested") return "Address change requested";
  if (status === "rejected") return "Address change rejected";
  if (status === "rejected_timeout") return "Address change expired";
  return "Address change";
}

function getRefundRequestMeta(value) {
  const status = String(value || "").toLowerCase();
  if (status === "pending") return "Return request pending";
  if (status === "manual_review_required") return "Return needs review";
  if (status === "approved") return "Return approved";
  if (status === "rejected") return "Return rejected";
  if (status === "refunded") return "Refund completed";
  return "Return request";
}

function matchesOrderActionQueue(order, queue) {
  if (queue !== "needs_action") {
    return true;
  }

  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();
  const addressChangeStatus = String(order.addressChangeStatus || "").toLowerCase();
  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();

  return (
    addressChangeStatus === "requested" ||
    ["payment_unknown", "payment_failed", "payment_pending"].includes(paymentStatus) ||
    ["retry_pending", "delivery_failed", "returning", "ready_to_ship", "handover"].includes(
      deliveryStatus,
    ) ||
    ["pending", "manual_review_required"].includes(refundStatus) ||
    orderStatus === "pending"
  );
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase();
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
