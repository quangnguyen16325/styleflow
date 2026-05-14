import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import ApiService from "../../api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

const ALL_STATUSES = ["pending", "processing", "shipping", "completed", "cancelled", "failed"];

const DELIVERY_CALLBACK_STATUSES = [
  { value: "HANDOVER", label: "Handover" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED", label: "Returned" },
];

const ADDRESS_CHANGE_DECISIONS = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "rejected_timeout", label: "Reject (Timeout)" },
];

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [deliveryEventsLoading, setDeliveryEventsLoading] = useState(true);
  const [deliveryEventsError, setDeliveryEventsError] = useState(null);

  // Status update state
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Delivery update state
  const [deliveryUpdateStatus, setDeliveryUpdateStatus] = useState("HANDOVER");
  const [deliveryPartner, setDeliveryPartner] = useState("admin");
  const [deliveryReason, setDeliveryReason] = useState("");
  const [deliveryUpdating, setDeliveryUpdating] = useState(false);
  const [deliveryUpdateError, setDeliveryUpdateError] = useState(null);
  const [deliveryUpdateSuccess, setDeliveryUpdateSuccess] = useState(null);

  // Address change decision state
  const [addressDecision, setAddressDecision] = useState("approved");
  const [approvedShippingFee, setApprovedShippingFee] = useState("");
  const [addressDecisionLoading, setAddressDecisionLoading] = useState(false);
  const [addressDecisionError, setAddressDecisionError] = useState(null);
  const [addressDecisionSuccess, setAddressDecisionSuccess] = useState(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setDeliveryEventsLoading(true);
    setError(null);
    setDeliveryEventsError(null);

    Promise.allSettled([ApiService.getOrder(id), ApiService.getOrderDeliveryEvents(id)])
      .then(([orderRes, deliveryEventsRes]) => {
        if (!isActive) return;

        if (orderRes.status === "fulfilled") {
          setOrder(orderRes.value);
          setNewStatus(orderRes.value.status);
        } else {
          setError(orderRes.reason);
        }

        if (deliveryEventsRes.status === "fulfilled") {
          setDeliveryEvents(Array.isArray(deliveryEventsRes.value) ? deliveryEventsRes.value : []);
        } else {
          setDeliveryEvents([]);
          setDeliveryEventsError(deliveryEventsRes.reason);
        }
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
        setDeliveryEventsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const handleUpdateStatus = useCallback(async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    try {
      const updated = await ApiService.updateOrderStatus(id, newStatus);
      setOrder(updated);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err);
    } finally {
      setUpdating(false);
    }
  }, [id, newStatus, order]);

  const handleAddressChangeDecision = useCallback(async () => {
    setAddressDecisionLoading(true);
    setAddressDecisionError(null);
    setAddressDecisionSuccess(null);

    try {
      const response = await ApiService.submitAddressChangeDecision(
        id,
        addressDecision,
        addressDecision === "approved" ? approvedShippingFee : null,
      );
      setAddressDecisionSuccess(response?.action || addressDecision);

      const updatedOrder = await ApiService.getOrder(id);
      setOrder(updatedOrder);
    } catch (err) {
      setAddressDecisionError(err);
    } finally {
      setAddressDecisionLoading(false);
    }
  }, [id, addressDecision, approvedShippingFee]);

  const handleUpdateDeliveryStatus = useCallback(async () => {
    setDeliveryUpdating(true);
    setDeliveryUpdateError(null);
    setDeliveryUpdateSuccess(null);

    try {
      const response = await ApiService.updateOrderDeliveryStatus(id, {
        status: deliveryUpdateStatus,
        partner: deliveryPartner,
        reason: deliveryReason,
      });
      if (response?.order) {
        setOrder(response.order);
        setNewStatus(response.order.status);
      }
      setDeliveryUpdateSuccess(response?.action || deliveryUpdateStatus.toLowerCase());

      const updatedEvents = await ApiService.getOrderDeliveryEvents(id);
      setDeliveryEvents(Array.isArray(updatedEvents) ? updatedEvents : []);
      setTimeout(() => setDeliveryUpdateSuccess(null), 3000);
    } catch (err) {
      setDeliveryUpdateError(err);
    } finally {
      setDeliveryUpdating(false);
    }
  }, [id, deliveryUpdateStatus, deliveryPartner, deliveryReason]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error) return <ErrorMessage error={error} onRetry={handleRetry} />;
  if (!order) return null;

  const shipping = order.shipping || {};
  const deliveryStatus = order.deliveryStatus || order.delivery_status || null;
  const deliveryFailCount = Number(order.deliveryFailCount ?? order.delivery_fail_count ?? NaN);
  const hasDeliveryFailCount = Number.isFinite(deliveryFailCount);

  const addressChangeStatus = String(
    order.addressChangeStatus ?? order.address_change_status ?? "none",
  ).toLowerCase();
  const addressChangePayload = order.addressChangePayload ?? order.address_change_payload;
  const canReviewAddressChange = addressChangeStatus === "requested";
  const hasAddressPayload = !!addressChangePayload && typeof addressChangePayload === "object";
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.priceAtPurchase || 0),
    0,
  );
  const computedSubtotal = Number(order.totalAmount || 0) - Number(order.shippingFee || 0);
  const paymentHint = getPaymentHint(order.paymentStatus, order.paymentGateway);

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <Link to="/orders" className="link">
          &larr; Back to Orders
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Order #{order.id}</h2>
          <p className="page-subtitle">
            Placed on <strong>{formatDate(order.createdAt)}</strong>
            {order.updatedAt && order.updatedAt !== order.createdAt && (
              <>
                {" "}
                · Updated <strong>{formatDate(order.updatedAt)}</strong>
              </>
            )}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            flexWrap: "wrap",
          }}
        >
          <HeaderBadge label="Order" value={order.status} />
          <HeaderBadge label="Payment" value={order.paymentStatus || "unpaid"} />
          <HeaderBadge label="Delivery" value={deliveryStatus || "pending"} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <SummaryCard label="Order Status" value={<StatusBadge value={order.status} showIcon />} />
        <SummaryCard
          label="Payment"
          value={<StatusBadge value={order.paymentStatus || "unpaid"} showIcon />}
          description={[
            formatPaymentGateway(order.paymentGateway),
            order.paymentExpiresAt ? `Expires ${formatDate(order.paymentExpiresAt)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <SummaryCard
          label="Delivery"
          value={<StatusBadge value={deliveryStatus || "pending"} showIcon />}
          description={
            addressChangeStatus !== "none"
              ? `Address change ${addressChangeStatus.replace(/_/g, " ")}`
              : null
          }
        />
        <SummaryCard
          label="Total"
          value={formatCurrency(order.totalAmount)}
          description={`Shipping ${formatCurrency(order.shippingFee)}`}
        />
      </div>

      {(deliveryStatus || hasDeliveryFailCount) && (
        <div
          className="card"
          style={{ padding: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)" }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              fontSize: "var(--font-size-md)",
              color: "var(--color-dark)",
            }}
          >
            Delivery Signals
          </h3>
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-sm)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {deliveryStatus && (
              <div style={{ display: "flex", gap: "var(--spacing-xs)", alignItems: "center" }}>
                <strong style={{ fontSize: "var(--font-size-sm)" }}>Delivery Status:</strong>
                <StatusBadge value={deliveryStatus} />
              </div>
            )}
            {hasDeliveryFailCount && (
              <div style={{ fontSize: "var(--font-size-sm)" }}>
                <strong>Delivery Fail Count:</strong> {deliveryFailCount}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <SectionCard title="Payment Details">
          <DetailRow label="Method" value={formatPaymentGateway(order.paymentGateway)} />
          <DetailRow
            label="Payment Status"
            value={<StatusBadge value={order.paymentStatus || "unpaid"} showIcon />}
          />
          <DetailRow
            label="Payment Expires"
            value={
              order.paymentGateway === "COD" && !order.paymentExpiresAt
                ? "Not applicable for COD"
                : formatDate(order.paymentExpiresAt)
            }
          />
          <DetailRow label="Transaction Ref" value={order.transactionRef || "—"} />
          <DetailRow label="Incident ID" value={order.incidentId || "—"} />
          <DetailRow label="Payment Note" value={paymentHint} />
        </SectionCard>

        <SectionCard title="Fulfillment Snapshot">
          <DetailRow label="Order Status" value={<StatusBadge value={order.status} showIcon />} />
          <DetailRow
            label="Delivery Status"
            value={<StatusBadge value={deliveryStatus || "pending"} showIcon />}
          />
          <DetailRow
            label="Address Change"
            value={<StatusBadge value={addressChangeStatus || "none"} showIcon />}
          />
          <DetailRow
            label="Delivery Events"
            value={`${deliveryEvents.length} event${deliveryEvents.length === 1 ? "" : "s"}`}
          />
          <DetailRow label="Delivery Partner" value={order.deliveryPartner || "—"} />
          <DetailRow
            label="Assigned Shipper"
            value={
              order.assignedShipper
                ? `${order.assignedShipper.fullName} · ${order.assignedShipper.phone || "no phone"}`
                : "Unassigned"
            }
          />
          <DetailRow
            label="Last Failure Reason"
            value={order.lastDeliveryFailedReason || "—"}
          />
        </SectionCard>

        <SectionCard title="Order Metadata">
          <DetailRow label="Order ID" value={`#${order.id}`} />
          <DetailRow label="Customer Address ID" value={order.customerAddressId ?? "—"} />
          <DetailRow label="Order City" value={order.city || shipping.city || "—"} />
          <DetailRow label="Fail Count" value={formatNumber(order.failCount)} />
          <DetailRow label="Created" value={formatDate(order.createdAt)} />
          <DetailRow label="Updated" value={formatDate(order.updatedAt)} />
        </SectionCard>
      </div>

      <div
        className="card"
        style={{ padding: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)" }}
      >
        <h3
          style={{
            margin: "0 0 var(--spacing-md) 0",
            fontSize: "var(--font-size-md)",
            color: "var(--color-dark)",
          }}
        >
          Update Delivery Status
        </h3>
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            value={deliveryUpdateStatus}
            onChange={(event) => setDeliveryUpdateStatus(event.target.value)}
            className="form-select"
            style={{ width: "180px" }}
            disabled={deliveryUpdating}
          >
            {DELIVERY_CALLBACK_STATUSES.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
          <input
            value={deliveryPartner}
            onChange={(event) => setDeliveryPartner(event.target.value)}
            className="form-input"
            placeholder="Partner / shipper"
            style={{ width: "180px" }}
            disabled={deliveryUpdating}
          />
          <input
            value={deliveryReason}
            onChange={(event) => setDeliveryReason(event.target.value)}
            className="form-input"
            placeholder="Reason, required if failed"
            style={{ width: "260px" }}
            disabled={deliveryUpdating}
          />
          <button
            className="btn-primary"
            onClick={handleUpdateDeliveryStatus}
            disabled={deliveryUpdating || (deliveryUpdateStatus === "FAILED" && !deliveryReason.trim())}
          >
            {deliveryUpdating ? "Updating..." : "Update Delivery"}
          </button>
        </div>
        <p
          style={{
            margin: "var(--spacing-sm) 0 0 0",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            lineHeight: 1.5,
          }}
        >
          Delivered will complete the order. If this is COD, backend also marks payment as paid and
          writes a payment log.
        </p>
        {deliveryUpdateError && (
          <div style={{ marginTop: "var(--spacing-sm)" }}>
            <ErrorMessage error={deliveryUpdateError} />
          </div>
        )}
        {deliveryUpdateSuccess && (
          <div
            style={{
              marginTop: "var(--spacing-sm)",
              padding: "var(--spacing-sm) var(--spacing-md)",
              background: "var(--color-success-light)",
              color: "var(--color-success)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Delivery status updated ({deliveryUpdateSuccess})
          </div>
        )}
      </div>

      {/* Status Update Action */}
      <div
        className="card"
        style={{ padding: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)" }}
      >
        <h3
          style={{
            margin: "0 0 var(--spacing-md) 0",
            fontSize: "var(--font-size-md)",
            color: "var(--color-dark)",
          }}
        >
          Update Order Status
        </h3>
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select"
            style={{ width: "220px" }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleUpdateStatus}
            disabled={updating || newStatus === order.status}
          >
            {updating ? "Updating..." : "Update Status"}
          </button>
          {newStatus === order.status && (
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              Current status selected
            </span>
          )}
        </div>
        <p
          style={{
            margin: "var(--spacing-sm) 0 0 0",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            lineHeight: 1.5,
          }}
        >
          Backend status only accepts pending, processing, shipping, completed, cancelled, failed.
          Completed finalizes the order lifecycle; cancelled/failed may release reserved inventory.
        </p>
        {updateError && (
          <div style={{ marginTop: "var(--spacing-sm)" }}>
            <ErrorMessage error={updateError} />
          </div>
        )}
        {updateSuccess && (
          <div
            style={{
              marginTop: "var(--spacing-sm)",
              padding: "var(--spacing-sm) var(--spacing-md)",
              background: "var(--color-success-light)",
              color: "var(--color-success)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Status updated successfully
          </div>
        )}
      </div>

      {(addressChangeStatus !== "none" || hasAddressPayload) && (
        <div
          className="card"
          style={{ padding: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)" }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              fontSize: "var(--font-size-md)",
              color: "var(--color-dark)",
            }}
          >
            Address Change Approval
          </h3>
          <div
            style={{
              marginBottom: "var(--spacing-md)",
              display: "flex",
              gap: "var(--spacing-xs)",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}
            >
              Current Request Status:
            </span>
            <StatusBadge value={addressChangeStatus} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "var(--spacing-lg)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            <div
              style={{
                padding: "var(--spacing-md)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg)",
              }}
            >
              <h4
                style={{
                  margin: "0 0 var(--spacing-sm) 0",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-dark)",
                }}
              >
                Current Shipping Snapshot
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-xs)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <div>
                  <strong>Receiver:</strong> {shipping.receiverName || "—"}
                </div>
                <div>
                  <strong>Phone:</strong> {shipping.receiverPhone || "—"}
                </div>
                <div>
                  <strong>Address:</strong> {shipping.fullAddress || shipping.addressLine || "—"}
                </div>
                <div>
                  <strong>Shipping Fee:</strong> {formatCurrency(order.shippingFee)}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "var(--spacing-md)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg)",
              }}
            >
              <h4
                style={{
                  margin: "0 0 var(--spacing-sm) 0",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-dark)",
                }}
              >
                Requested Payload
              </h4>
              {!hasAddressPayload ? (
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                  Requested payload is not available from API response.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--spacing-xs)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  <div>
                    <strong>Receiver:</strong> {addressChangePayload.receiverName || "—"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {addressChangePayload.receiverPhone || "—"}
                  </div>
                  <div>
                    <strong>Address:</strong>{" "}
                    {addressChangePayload.fullAddress || addressChangePayload.addressLine || "—"}
                  </div>
                  <div>
                    <strong>Calculated Shipping Fee:</strong>{" "}
                    {formatCurrency(addressChangePayload.calculatedShippingFee)}
                  </div>
                  <div>
                    <strong>Processing Fee:</strong>{" "}
                    {formatCurrency(addressChangePayload.processingFee)}
                  </div>
                  <div>
                    <strong>Current Shipping Fee:</strong>{" "}
                    {formatCurrency(addressChangePayload.currentShippingFee)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--spacing-sm)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={addressDecision}
              onChange={(e) => setAddressDecision(e.target.value)}
              className="form-select"
              style={{ width: "220px" }}
              disabled={!canReviewAddressChange || addressDecisionLoading}
            >
              {ADDRESS_CHANGE_DECISIONS.map((decisionItem) => (
                <option key={decisionItem.value} value={decisionItem.value}>
                  {decisionItem.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={approvedShippingFee}
              onChange={(e) => setApprovedShippingFee(e.target.value)}
              placeholder="Approved shipping fee (optional)"
              className="form-input"
              style={{ width: "240px" }}
              disabled={
                !canReviewAddressChange || addressDecisionLoading || addressDecision !== "approved"
              }
            />
            <button
              className="btn-primary"
              onClick={handleAddressChangeDecision}
              disabled={!canReviewAddressChange || addressDecisionLoading}
            >
              {addressDecisionLoading ? "Submitting..." : "Submit Decision"}
            </button>
          </div>

          {!canReviewAddressChange && (
            <div
              style={{
                marginTop: "var(--spacing-sm)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              This order does not have a pending address change request.
            </div>
          )}
          {addressDecisionError && (
            <div style={{ marginTop: "var(--spacing-sm)" }}>
              <ErrorMessage error={addressDecisionError} />
            </div>
          )}
          {addressDecisionSuccess && (
            <div
              style={{
                marginTop: "var(--spacing-sm)",
                padding: "var(--spacing-sm) var(--spacing-md)",
                background: "var(--color-success-light)",
                color: "var(--color-success)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Address change decision submitted ({addressDecisionSuccess})
            </div>
          )}
        </div>
      )}

      {/* Information Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        {/* Customer Block */}
        <div className="card" style={{ padding: "var(--spacing-xl)" }}>
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              borderBottom: "1px solid var(--color-border)",
              paddingBottom: "var(--spacing-sm)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            Customer Information
          </h3>
          {order.customer ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-sm)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <DetailRow
                label="Customer ID"
                value={order.customer.id ? `#${order.customer.id}` : "—"}
              />
              <DetailRow label="Name" value={order.customer.fullName || "—"} />
              <DetailRow
                label="Phone"
                value={
                  order.customer.phone ? (
                    <a href={`tel:${order.customer.phone}`} className="link">
                      {order.customer.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Email"
                value={
                  order.customer.email ? (
                    <a href={`mailto:${order.customer.email}`} className="link">
                      {order.customer.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          ) : (
            <span style={{ color: "var(--color-text-muted)" }}>No customer data available</span>
          )}
        </div>

        {/* Shipping Snapshot Block */}
        <div className="card" style={{ padding: "var(--spacing-xl)" }}>
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              borderBottom: "1px solid var(--color-border)",
              paddingBottom: "var(--spacing-sm)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            Shipping Snapshot
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-sm)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <DetailRow label="Receiver" value={shipping.receiverName || "—"} />
            <DetailRow
              label="Phone"
              value={
                shipping.receiverPhone ? (
                  <a href={`tel:${shipping.receiverPhone}`} className="link">
                    {shipping.receiverPhone}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow label="Address" value={shipping.addressLine || "—"} />
            <DetailRow label="Ward" value={shipping.ward || "—"} />
            <DetailRow label="District" value={shipping.district || "—"} />
            <DetailRow label="City" value={shipping.city || "—"} />
            <DetailRow label="Country" value={shipping.country || "—"} />
            <DetailRow label="Postal Code" value={shipping.postalCode || "—"} />
            <DetailRow label="Province Code" value={shipping.provinceCode || "—"} />
            <DetailRow label="District Code" value={shipping.districtCode || "—"} />
            <DetailRow label="Ward Code" value={shipping.wardCode || "—"} />
            {shipping.fullAddress && (
              <div
                style={{
                  marginTop: "var(--spacing-xs)",
                  padding: "var(--spacing-sm)",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {shipping.fullAddress}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ overflow: "hidden", marginBottom: "var(--spacing-xl)" }}>
        <h3
          style={{
            margin: 0,
            padding: "var(--spacing-lg) var(--spacing-xl)",
            backgroundColor: "var(--color-bg)",
            borderBottom: "1px solid var(--color-border)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Ordered Items
        </h3>
        {items.length === 0 ? (
          <div style={{ padding: "var(--spacing-lg)" }}>
            <EmptyState title="No Items" description="This order does not contain item rows." />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th>Product</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || `${item.productId}-${index}`}>
                  <td style={{ color: "var(--color-text-muted)" }}>#{item.id || index + 1}</td>
                  <td>
                    <Link to={`/products/${item.productId}`} className="link">
                      Product #{item.productId}
                    </Link>
                  </td>
                  <td style={{ textAlign: "right" }}>{formatNumber(item.quantity)}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(item.priceAtPurchase)}</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>
                    {formatCurrency(Number(item.quantity || 0) * Number(item.priceAtPurchase || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: "bold" }}>
                  Items Subtotal
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatCurrency(itemsSubtotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden", marginBottom: "var(--spacing-xl)" }}>
        <h3
          style={{
            margin: 0,
            padding: "var(--spacing-lg) var(--spacing-xl)",
            backgroundColor: "var(--color-bg)",
            borderBottom: "1px solid var(--color-border)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Delivery Events
        </h3>
        {deliveryEventsLoading ? (
          <LoadingSpinner message="Loading delivery events..." />
        ) : deliveryEventsError ? (
          <div style={{ padding: "var(--spacing-lg)" }}>
            <ErrorMessage error={deliveryEventsError} />
          </div>
        ) : deliveryEvents.length === 0 ? (
          <div style={{ padding: "var(--spacing-lg)" }}>
            <EmptyState
              title="No Delivery Events"
              description="This order does not have delivery callback events yet."
            />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Status</th>
                <th>Reason</th>
                <th>External Event ID</th>
                <th>Created At</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {deliveryEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.partner || "—"}</td>
                  <td>
                    <StatusBadge value={event.status} />
                  </td>
                  <td>{event.reason || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "var(--font-size-sm)" }}>
                    {event.externalEventId || "—"}
                  </td>
                  <td style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                    {formatDate(event.createdAt)}
                  </td>
                  <td>
                    <PayloadDetails payload={event.payload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Financial Summary */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div className="card" style={{ width: "340px", padding: "var(--spacing-xl)" }}>
          <h3
            style={{
              margin: "0 0 var(--spacing-md) 0",
              borderBottom: "1px solid var(--color-border)",
              paddingBottom: "var(--spacing-sm)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            Financial Summary
          </h3>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--spacing-sm)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <span>Subtotal (Items)</span>
            <span>{formatCurrency(computedSubtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--spacing-md)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <span>Shipping Fee</span>
            <span>{formatCurrency(order.shippingFee)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "var(--spacing-md)",
              borderTop: "2px solid var(--color-border)",
              fontSize: "var(--font-size-lg)",
            }}
          >
            <span style={{ fontWeight: "var(--font-weight-bold)" }}>Total Amount</span>
            <span style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-bold)" }}>
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
          {itemsSubtotal !== computedSubtotal && (
            <div
              style={{
                marginTop: "var(--spacing-sm)",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-xs)",
                lineHeight: 1.5,
              }}
            >
              Item rows total {formatCurrency(itemsSubtotal)}. Difference can come from approved
              address-change fee, discounts, or historical totals stored on the order.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatPaymentGateway(value) {
  const gateway = String(value || "").toUpperCase();
  if (gateway === "COD") return "Cash on delivery";
  if (gateway === "BANK_TRANSFER") return "Bank transfer";
  if (gateway === "MOMO") return "MoMo";
  return value || "No payment method";
}

function getPaymentHint(paymentStatus, paymentGateway) {
  const status = String(paymentStatus || "unpaid").toLowerCase();
  const gateway = String(paymentGateway || "").toUpperCase();

  if (status === "paid") return "Payment confirmed. Order can move through fulfillment.";
  if (status === "paid_held") return "Payment received but held for review.";
  if (status === "payment_pending") {
    return gateway === "BANK_TRANSFER"
      ? "Waiting for bank transfer webhook to confirm payment."
      : "Waiting for payment gateway confirmation.";
  }
  if (status === "payment_failed") return "Payment failed. Customer may need a new checkout.";
  if (status === "refund_pending") return "Refund is being processed.";
  if (status === "refunded") return "Payment has been refunded.";
  if (status === "payment_unknown") return "Payment state is unknown. Check payment events.";
  if (gateway === "COD") return "COD order does not require online prepayment.";
  return "Payment has not been confirmed yet.";
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="card" style={{ padding: "var(--spacing-lg)" }}>
      <div
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-bold)",
          letterSpacing: "0.055em",
          textTransform: "uppercase",
          marginBottom: "var(--spacing-sm)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-dark)",
        }}
      >
        {value}
      </div>
      {description ? (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            marginTop: "var(--spacing-xs)",
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

function HeaderBadge({ label, value }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-xs)",
        padding: "4px 6px 4px 10px",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface)",
      }}
    >
      <span
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-bold)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <StatusBadge value={value} showIcon />
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ padding: "var(--spacing-xl)" }}>
      <h3
        style={{
          margin: "0 0 var(--spacing-md) 0",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "var(--spacing-sm)",
          fontSize: "var(--font-size-md)",
          fontWeight: "var(--font-weight-semibold)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-sm)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px minmax(0, 1fr)",
        gap: "var(--spacing-sm)",
        alignItems: "start",
      }}
    >
      <strong style={{ color: "var(--color-text-secondary)" }}>{label}:</strong>
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{value ?? "—"}</span>
    </div>
  );
}

function PayloadDetails({ payload }) {
  if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
    return <span style={{ color: "var(--color-text-muted)" }}>—</span>;
  }

  return (
    <details>
      <summary className="link" style={{ cursor: "pointer" }}>
        View payload
      </summary>
      <pre
        style={{
          margin: "var(--spacing-sm) 0 0 0",
          maxWidth: "420px",
          maxHeight: "220px",
          overflow: "auto",
          padding: "var(--spacing-sm)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-bg)",
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-xs)",
        }}
      >
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}
