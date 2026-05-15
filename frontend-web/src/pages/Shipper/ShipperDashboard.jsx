import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ApiService from "../../api";
import EmptyState from "../../components/ui/EmptyState";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";

const DELIVERY_STATUSES = [
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "READY_TO_SHIP", label: "Ready to ship" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED", label: "Returned" },
];

const DELIVERY_SORT_PRIORITY = {
  in_transit: 0,
  handover: 1,
  ready_to_ship: 1,
  delivered: 2,
  delivery_failed: 3,
  retry_pending: 3,
  failed: 3,
  returning: 4,
  returned: 5,
};

function getDeliverySortPriority(order) {
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();

  if (refundStatus === "approved" && ["delivered", "handover"].includes(deliveryStatus)) {
    return -1;
  }

  return DELIVERY_SORT_PRIORITY[deliveryStatus] ?? 6;
}

function getAvailableDeliveryStatuses(order) {
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();
  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();

  if (deliveryStatus === "returned") {
    return [];
  }

  if (deliveryStatus === "returning") {
    return DELIVERY_STATUSES.filter((statusOption) => statusOption.value === "RETURNED");
  }

  if (orderStatus === "completed" || deliveryStatus === "delivered") {
    if (refundStatus === "approved") {
      return DELIVERY_STATUSES.filter((statusOption) =>
        ["FAILED", "RETURNED"].includes(statusOption.value),
      );
    }

    return [];
  }

  return DELIVERY_STATUSES;
}

function getDeliveryLockMessage(order, availableStatuses) {
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();
  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();

  if (deliveryStatus === "returned") {
    return "This order has already been returned. Delivery status can no longer be updated.";
  }

  if (
    availableStatuses.length === 0 &&
    (orderStatus === "completed" || deliveryStatus === "delivered")
  ) {
    return refundStatus === "approved"
      ? ""
      : "This delivery is already completed. Return handling unlocks after a return request is approved.";
  }

  return "";
}

export default function ShipperDashboard() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [deliveryReasons, setDeliveryReasons] = useState({});

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.getShipperOrders();
      setOrders(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(() => {
    const term = normalizeSearchText(searchTerm);
    const filteredOrders = term
      ? orders.filter((order) => matchesDeliverySearch(order, term))
      : orders;

    return [...filteredOrders].sort((a, b) => {
      const aPriority = getDeliverySortPriority(a);
      const bPriority = getDeliverySortPriority(b);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [orders, searchTerm]);

  const updateDeliveryStatus = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);
      setError(null);
      const response = await ApiService.updateShipperOrderDeliveryStatus(orderId, {
        status,
        reason: deliveryReasons[orderId] || "",
      });
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? response.order || order : order)),
      );
      setDeliveryReasons((current) => ({ ...current, [orderId]: "" }));
    } catch (err) {
      setError(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your deliveries..." />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">My Deliveries</h2>
          <p className="page-subtitle">
            Orders assigned to you. Update delivery status after each real delivery event.
            {searchTerm ? ` Showing matches for "${searchTerm}".` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <ErrorMessage error={error} onRetry={loadOrders} onDismiss={() => setError(null)} />
        </div>
      )}

      {sortedOrders.length === 0 ? (
        <div className="card" style={{ padding: "var(--spacing-xl)" }}>
          <EmptyState
            title={searchTerm ? "No Deliveries Found" : "No Assigned Orders"}
            description={
              searchTerm
                ? "No assigned deliveries match your current search."
                : "You do not have delivery orders assigned right now."
            }
          />
        </div>
      ) : (
        <div className="shipper-delivery-grid">
          {sortedOrders.map((order) => (
            <div key={order.id} className="card" style={{ padding: "var(--spacing-lg)" }}>
              {(() => {
                const availableStatuses = getAvailableDeliveryStatuses(order);
                const deliveryLockMessage = getDeliveryLockMessage(order, availableStatuses);
                const isDeliveryLocked = availableStatuses.length === 0;

                return (
                  <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "var(--spacing-md)",
                  alignItems: "flex-start",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "var(--color-dark)",
                      fontSize: "var(--font-size-lg)",
                    }}
                  >
                    Order #{order.id}
                  </h3>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                    {formatCurrency(order.totalAmount)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                  <StatusBadge value={order.status} />
                  <StatusBadge value={order.deliveryStatus || "pending"} />
                  {order.latestRefundRequestStatus === "approved" ? (
                    <ReturnPickupBadge />
                  ) : null}
                </div>
              </div>

              <InfoRow label="Receiver" value={order.shipping?.receiverName || "—"} />
              <InfoRow label="Phone" value={order.shipping?.receiverPhone || "—"} />
              <InfoRow label="Address" value={order.shipping?.fullAddress || "—"} />
              <InfoRow label="Payment" value={`${order.paymentGateway || "—"} · ${order.paymentStatus || "—"}`} />
              <InfoRow label="Items" value={`${order.items?.length || 0} line(s)`} />
              <InfoRow label="Return request" value={order.latestRefundRequestStatus || "—"} />
              <InfoRow label="Fail count" value={String(order.deliveryFailCount || 0)} />

              {order.lastDeliveryFailedReason ? (
                <InfoRow label="Last fail" value={order.lastDeliveryFailedReason} />
              ) : null}

              <Link
                to={`/shipper/orders/${order.id}`}
                className="btn-secondary btn-sm"
                style={{
                  display: "inline-flex",
                  marginTop: "var(--spacing-sm)",
                  textDecoration: "none",
                }}
              >
                View order details
              </Link>

              <div style={{ marginTop: "var(--spacing-md)" }}>
                {deliveryLockMessage ? (
                  <div
                    style={{
                      padding: "var(--spacing-md)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-bg-muted)",
                      color: "var(--color-text-muted)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {deliveryLockMessage}
                  </div>
                ) : null}
                <textarea
                  className="form-input"
                  value={deliveryReasons[order.id] || ""}
                  onChange={(event) =>
                    setDeliveryReasons((current) => ({
                      ...current,
                      [order.id]: event.target.value,
                    }))
                  }
                  placeholder="Reason, required when marking failed"
                  rows={2}
                  disabled={updatingOrderId === order.id || isDeliveryLocked}
                  style={{ resize: "vertical", marginBottom: "var(--spacing-sm)" }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
                  {availableStatuses.map((statusOption) => (
                    <button
                      key={statusOption.value}
                      className={
                        statusOption.value === "DELIVERED" ? "btn-primary btn-sm" : "btn-secondary btn-sm"
                      }
                      disabled={
                        updatingOrderId === order.id ||
                        (statusOption.value === "FAILED" && !deliveryReasons[order.id]?.trim())
                      }
                      onClick={() => updateDeliveryStatus(order.id, statusOption.value)}
                    >
                      {updatingOrderId === order.id ? "Updating..." : statusOption.label}
                    </button>
                  ))}
                </div>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "88px minmax(0, 1fr)",
        gap: "var(--spacing-sm)",
        marginBottom: "var(--spacing-xs)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <strong style={{ color: "var(--color-text-secondary)" }}>{label}:</strong>
      <span style={{ overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

function ReturnPickupBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 10px",
        borderRadius: "var(--radius-sm)",
        background: "#ecfdf5",
        color: "#047857",
        border: "1px solid #10b98130",
        fontSize: "13px",
        fontWeight: "var(--font-weight-medium)",
        whiteSpace: "nowrap",
      }}
    >
      Return pickup
    </span>
  );
}

function matchesDeliverySearch(order, term) {
  const compactTerm = term.replace(/\s+/g, "");
  const digitTerm = term.replace(/\D/g, "");
  const orderId = String(order.id || "");
  const values = [
    orderId,
    `#${orderId}`,
    `ord${orderId}`,
    order.status,
    order.deliveryStatus,
    order.paymentStatus,
    order.paymentGateway,
    order.shipping?.receiverName,
    order.shipping?.receiverPhone,
    order.shipping?.fullAddress,
    order.customer?.fullName,
    order.customer?.phone,
  ];

  return values.some((value) => {
    const normalizedValue = normalizeSearchText(value);
    if (!normalizedValue) return false;
    if (normalizedValue.includes(term) || normalizedValue.replace(/\s+/g, "").includes(compactTerm)) {
      return true;
    }
    return digitTerm && normalizedValue.replace(/\D/g, "").includes(digitTerm);
  });
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
