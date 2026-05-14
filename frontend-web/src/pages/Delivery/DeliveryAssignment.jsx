import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApiService from "../../api";
import EmptyState from "../../components/ui/EmptyState";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";

export default function DeliveryAssignment() {
  const [orders, setOrders] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderList, shipperList] = await Promise.all([
        ApiService.getOrders(),
        ApiService.getShippers(),
      ]);
      setOrders(Array.isArray(orderList) ? orderList : []);
      setShippers(Array.isArray(shipperList) ? shipperList : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignableOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !["completed", "cancelled", "failed"].includes(order.status) &&
          !["delivered", "returned", "returning"].includes(order.deliveryStatus),
      ),
    [orders],
  );

  const handleAssign = async (orderId, shipperId) => {
    try {
      setUpdatingOrderId(orderId);
      const response = await ApiService.assignOrderShipper(
        orderId,
        shipperId ? Number(shipperId) : null,
      );
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? response.order || order : order)),
      );
    } catch (err) {
      setError(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading delivery assignments..." />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Delivery Assignment</h2>
          <p className="page-subtitle">
            Assign active orders to shipper accounts and move them into ready-to-ship.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <ErrorMessage error={error} onRetry={loadData} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {assignableOrders.length === 0 ? (
          <div style={{ padding: "var(--spacing-xl)" }}>
            <EmptyState
              title="No Active Delivery Orders"
              description="There are no pending, processing, or shipping orders available for assignment."
            />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Customer</th>
                <th>Destination</th>
                <th>Shipper</th>
              </tr>
            </thead>
            <tbody>
              {assignableOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/orders/${order.id}`} className="link">
                      #{order.id}
                    </Link>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge value={order.status} />
                  </td>
                  <td>
                    <StatusBadge value={order.deliveryStatus || "pending"} />
                  </td>
                  <td>
                    <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                      {order.customer?.fullName || "—"}
                    </div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                      {order.customer?.phone || "—"}
                    </div>
                  </td>
                  <td>{order.city || order.shipping?.city || "—"}</td>
                  <td>
                    <select
                      className="form-select"
                      value={order.assignedShipperId || ""}
                      onChange={(event) => handleAssign(order.id, event.target.value)}
                      disabled={updatingOrderId === order.id}
                      style={{ minWidth: "220px" }}
                    >
                      <option value="">Unassigned</option>
                      {shippers.map((shipper) => (
                        <option key={shipper.id} value={shipper.id}>
                          {shipper.fullName} · {shipper.phone}
                        </option>
                      ))}
                    </select>
                    {order.assignedShipper ? (
                      <div
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                          marginTop: "var(--spacing-xs)",
                        }}
                      >
                        Assigned to {order.assignedShipper.fullName}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} đ`;
}
