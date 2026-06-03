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

const SHIPPER_QUEUE_FILTERS = [
  {
    value: "work",
    title: "Need action",
    description: "Active, retry and return pickup",
    tone: "warning",
  },
  {
    value: "all",
    title: "All deliveries",
    description: "Everything assigned to you",
    tone: "default",
  },
  {
    value: "retry",
    title: "Need retry",
    description: "Failed deliveries to try again",
    tone: "warning",
  },
  {
    value: "pickup",
    title: "Return pickup",
    description: "Approved returns to collect",
    tone: "success",
  },
  {
    value: "active",
    title: "Active route",
    description: "Handover, ready or in transit",
    tone: "info",
  },
  {
    value: "done",
    title: "Done",
    description: "Delivered or returned",
    tone: "default",
  },
];

const DELIVERY_FAILURE_REASONS = [
  "Khách không nghe máy",
  "Sai hoặc thiếu địa chỉ",
  "Khách hẹn giao lại sau",
  "Khách từ chối nhận hàng",
  "Khách chưa bàn giao hàng trả",
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";
  const queueFilter = normalizeQueueFilter(searchParams.get("queue"));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [deliveryReasons, setDeliveryReasons] = useState({});
  const [copiedOrderId, setCopiedOrderId] = useState(null);

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
    const filteredOrders = orders.filter((order) => {
      const matchesQueue = queueFilter === "all" || matchesShipperQueue(order, queueFilter);
      const matchesSearch = term ? matchesDeliverySearch(order, term) : true;
      return matchesQueue && matchesSearch;
    });

    return [...filteredOrders].sort((a, b) => {
      const aPriority = getDeliverySortPriority(a);
      const bPriority = getDeliverySortPriority(b);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [orders, queueFilter, searchTerm]);

  const queueCounts = useMemo(() => buildShipperQueueCounts(orders), [orders]);
  const updateDeliveryStatus = async (orderId, status) => {
    const order = orders.find((currentOrder) => currentOrder.id === orderId);
    if (status === "DELIVERED" && getShipperCollectionAmount(order) > 0) {
      const confirmed = window.confirm(
        `Confirm COD collection for order #${orderId}: ${formatShipperCollectionAmount(order)}?`,
      );
      if (!confirmed) return;
    }

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

  const setPresetReason = (orderId, reason) => {
    setDeliveryReasons((current) => ({ ...current, [orderId]: reason }));
  };

  const copyAddress = async (order) => {
    const address = order.shipping?.fullAddress || "";
    if (!address.trim()) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopiedOrderId(order.id);
      window.setTimeout(() => setCopiedOrderId(null), 1600);
    } catch {
      setError(new Error("Unable to copy address. Please copy it manually."));
    }
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    const nextParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      nextParams.set("q", value);
    } else {
      nextParams.delete("q");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const clearSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    setSearchParams(nextParams, { replace: true });
  };

  const handleQueueFilterChange = (nextQueue) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextQueue === "work") {
      nextParams.delete("queue");
    } else {
      nextParams.set("queue", nextQueue);
    }

    setSearchParams(nextParams, { replace: true });
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
            {queueFilter !== "work" ? ` Filtered by ${formatQueueFilterLabel(queueFilter)}.` : ""}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        {SHIPPER_QUEUE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleQueueFilterChange(filter.value)}
            style={{
              textAlign: "left",
              padding: "var(--spacing-md)",
              borderRadius: "var(--radius-lg)",
              border:
                queueFilter === filter.value
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border-light)",
              background: getQueueFilterBackground(filter.tone, queueFilter === filter.value),
              boxShadow: queueFilter === filter.value ? "var(--shadow-md)" : "var(--shadow-sm)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "var(--spacing-sm)",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: "var(--color-dark)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-bold)",
                }}
              >
                {filter.title}
              </span>
              <span
                style={{
                  color: getQueueFilterColor(filter.tone),
                  fontSize: "var(--font-size-xl)",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {queueCounts[filter.value] ?? 0}
              </span>
            </div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
              {filter.description}
            </div>
          </button>
        ))}
      </div>

      <div
        className="card"
        style={{
          padding: "var(--spacing-lg)",
          marginBottom: "var(--spacing-lg)",
          display: "flex",
          gap: "var(--spacing-sm)",
          alignItems: "center",
        }}
      >
        <input
          className="form-input"
          type="search"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search order ID, receiver, phone, address, status..."
          aria-label="Search deliveries"
          style={{ marginBottom: 0 }}
        />
        {searchTerm ? (
          <button type="button" className="btn-secondary btn-sm" onClick={clearSearch}>
            Clear
          </button>
        ) : null}
        {queueFilter !== "work" ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => handleQueueFilterChange("work")}
          >
            Clear filter
          </button>
        ) : null}
      </div>

      {error && (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <ErrorMessage error={error} onRetry={loadOrders} onDismiss={() => setError(null)} />
        </div>
      )}

      {sortedOrders.length === 0 ? (
        <div className="card" style={{ padding: "var(--spacing-xl)" }}>
          <EmptyState
            title={
              searchTerm
                ? "No Deliveries Found"
                : queueFilter === "work"
                  ? "No Orders Need Action"
                  : "No Assigned Orders"
            }
            description={
              searchTerm
                ? "No assigned deliveries match your current search/filter."
                : queueFilter === "work"
                  ? "Returned and completed orders are hidden by default. Use All deliveries or Done to review old orders."
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
                const collectionAmount = getShipperCollectionAmount(order);
                const phone = order.shipping?.receiverPhone || "";
                const address = order.shipping?.fullAddress || "";
                const mapsUrl = buildMapUrl(address);

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
                        <div
                          style={{
                            color: "var(--color-text-muted)",
                            fontSize: "var(--font-size-sm)",
                          }}
                        >
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div
                          style={{
                            marginTop: "var(--spacing-xs)",
                            color: collectionAmount > 0 ? "#9a3412" : "var(--color-text-muted)",
                            fontSize: "var(--font-size-sm)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          Collect: {formatShipperCollectionAmount(order)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--spacing-xs)",
                        }}
                      >
                        <StatusBadge value={order.status} />
                        <StatusBadge value={order.deliveryStatus || "pending"} />
                        {shouldShowReturnPickupBadge(order) ? <ReturnPickupBadge /> : null}
                      </div>
                    </div>

                    <InfoRow label="Receiver" value={order.shipping?.receiverName || "—"} />
                    <InfoRow label="Phone" value={order.shipping?.receiverPhone || "—"} />
                    <InfoRow label="Address" value={order.shipping?.fullAddress || "—"} />
                    <InfoRow
                      label="Payment"
                      value={`${order.paymentGateway || "—"} · ${order.paymentStatus || "—"}`}
                    />
                    <InfoRow label="Collect" value={formatShipperCollectionAmount(order)} />
                    <InfoRow label="Items" value={`${order.items?.length || 0} line(s)`} />
                    <InfoRow
                      label="Return request"
                      value={order.latestRefundRequestStatus || "—"}
                    />
                    <InfoRow label="Fail count" value={String(order.deliveryFailCount || 0)} />

                    {order.lastDeliveryFailedReason ? (
                      <InfoRow label="Last fail" value={order.lastDeliveryFailedReason} />
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        gap: "var(--spacing-sm)",
                        flexWrap: "wrap",
                        marginTop: "var(--spacing-sm)",
                      }}
                    >
                      <Link
                        to={`/shipper/orders/${order.id}`}
                        className="btn-secondary btn-sm"
                        style={{ display: "inline-flex", textDecoration: "none" }}
                      >
                        View order details
                      </Link>
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="btn-secondary btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          Call customer
                        </a>
                      ) : null}
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          Open map
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => copyAddress(order)}
                        disabled={!address}
                      >
                        {copiedOrderId === order.id ? "Copied" : "Copy address"}
                      </button>
                    </div>

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
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "var(--spacing-xs)",
                          marginBottom: "var(--spacing-sm)",
                        }}
                      >
                        {DELIVERY_FAILURE_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setPresetReason(order.id, reason)}
                            disabled={updatingOrderId === order.id || isDeliveryLocked}
                            style={{
                              padding: "5px 9px",
                              fontSize: "var(--font-size-xs)",
                            }}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
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
                              statusOption.value === "DELIVERED"
                                ? "btn-primary btn-sm"
                                : "btn-secondary btn-sm"
                            }
                            disabled={
                              updatingOrderId === order.id ||
                              (statusOption.value === "FAILED" &&
                                !deliveryReasons[order.id]?.trim())
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

function shouldShowReturnPickupBadge(order) {
  const refundStatus = String(order.latestRefundRequestStatus || "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  return refundStatus === "approved" && deliveryStatus !== "returned";
}

function buildShipperQueueCounts(orders) {
  const counts = {
    work: 0,
    all: Array.isArray(orders) ? orders.length : 0,
    retry: 0,
    pickup: 0,
    active: 0,
    done: 0,
  };

  if (!Array.isArray(orders)) {
    return counts;
  }

  orders.forEach((order) => {
    if (matchesShipperQueue(order, "work")) counts.work += 1;
    if (matchesShipperQueue(order, "retry")) counts.retry += 1;
    if (matchesShipperQueue(order, "pickup")) counts.pickup += 1;
    if (matchesShipperQueue(order, "active")) counts.active += 1;
    if (matchesShipperQueue(order, "done")) counts.done += 1;
  });

  return counts;
}

function matchesShipperQueue(order, queue) {
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();
  const deliveryFailCount = Number(order.deliveryFailCount || 0);
  const isReturnPickup = shouldShowReturnPickupBadge(order);

  if (queue === "retry") {
    return (
      ["retry_pending", "delivery_failed", "failed"].includes(deliveryStatus) ||
      (deliveryFailCount > 0 && !["returning", "returned", "delivered"].includes(deliveryStatus))
    );
  }

  if (queue === "pickup") {
    return isReturnPickup;
  }

  if (queue === "work") {
    return (
      isReturnPickup ||
      matchesShipperQueue(order, "retry") ||
      ["handover", "ready_to_ship", "in_transit"].includes(deliveryStatus)
    );
  }

  if (queue === "active") {
    return !isReturnPickup && ["handover", "ready_to_ship", "in_transit"].includes(deliveryStatus);
  }

  if (queue === "done") {
    return !isReturnPickup && ["delivered", "returned"].includes(deliveryStatus);
  }

  return true;
}

function normalizeQueueFilter(value) {
  const normalized = String(value || "work")
    .trim()
    .toLowerCase();
  return SHIPPER_QUEUE_FILTERS.some((filter) => filter.value === normalized) ? normalized : "work";
}

function formatQueueFilterLabel(value) {
  return SHIPPER_QUEUE_FILTERS.find((filter) => filter.value === value)?.title || "deliveries";
}

function getQueueFilterBackground(tone, active) {
  if (active) {
    return "linear-gradient(135deg, #fff8f1, #ffffff)";
  }

  const backgrounds = {
    warning: "var(--color-warning-light)",
    success: "var(--color-success-light)",
    info: "var(--color-info-light)",
    default: "#fff",
  };

  return backgrounds[tone] || backgrounds.default;
}

function getQueueFilterColor(tone) {
  const colors = {
    warning: "var(--color-warning)",
    success: "var(--color-success)",
    info: "var(--color-info)",
    default: "var(--color-dark)",
  };

  return colors[tone] || colors.default;
}

function getShipperCollectionAmount(order) {
  if (!order) {
    return 0;
  }

  const paymentGateway = String(order.paymentGateway || "").toUpperCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();

  if (["returned", "returning"].includes(deliveryStatus)) {
    return 0;
  }

  if (["paid", "paid_held", "refunded"].includes(paymentStatus)) {
    return 0;
  }

  if (paymentGateway !== "COD") {
    return 0;
  }

  const amount = Number(order.totalAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function buildMapUrl(address) {
  const normalizedAddress = String(address || "").trim();
  if (!normalizedAddress) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
}

function formatShipperCollectionAmount(order) {
  const amount = getShipperCollectionAmount(order);
  return amount > 0 ? formatCurrency(amount) : "No extra collection";
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
    if (
      normalizedValue.includes(term) ||
      normalizedValue.replace(/\s+/g, "").includes(compactTerm)
    ) {
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
