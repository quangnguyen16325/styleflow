import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ApiService from "../../api";
import EmptyState from "../../components/ui/EmptyState";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";

const DELIVERY_STATUSES = [
  { value: "HANDOVER", label: "Handover" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED", label: "Returned" },
];

function getAvailableDeliveryStatuses(order) {
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();

  if (deliveryStatus === "returned") {
    return [];
  }

  if (deliveryStatus === "returning") {
    return DELIVERY_STATUSES.filter((statusOption) => statusOption.value === "RETURNED");
  }

  return DELIVERY_STATUSES;
}

export default function ShipperDashboard() {
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
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <ErrorMessage error={error} onRetry={loadOrders} onDismiss={() => setError(null)} />
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card" style={{ padding: "var(--spacing-xl)" }}>
          <EmptyState
            title="No Assigned Orders"
            description="You do not have delivery orders assigned right now."
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--spacing-lg)",
          }}
        >
          {orders.map((order) => (
            <div key={order.id} className="card" style={{ padding: "var(--spacing-lg)" }}>
              {(() => {
                const availableStatuses = getAvailableDeliveryStatuses(order);
                const isTerminalReturned =
                  String(order.deliveryStatus || "").toLowerCase() === "returned";

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
                </div>
              </div>

              <InfoRow label="Receiver" value={order.shipping?.receiverName || "—"} />
              <InfoRow label="Phone" value={order.shipping?.receiverPhone || "—"} />
              <InfoRow label="Address" value={order.shipping?.fullAddress || "—"} />
              <InfoRow label="Payment" value={`${order.paymentGateway || "—"} · ${order.paymentStatus || "—"}`} />
              <InfoRow label="Items" value={`${order.items?.length || 0} line(s)`} />
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
                {isTerminalReturned ? (
                  <div
                    style={{
                      padding: "var(--spacing-md)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-bg-muted)",
                      color: "var(--color-text-muted)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    This order has already been returned. Delivery status can no longer be updated.
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
                  disabled={updatingOrderId === order.id || isTerminalReturned}
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

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} đ`;
}
