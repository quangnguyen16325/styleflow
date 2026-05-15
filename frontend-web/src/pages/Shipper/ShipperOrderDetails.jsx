import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, UserRound } from "lucide-react";
import ApiService from "../../api";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";

export default function ShipperOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.getShipperOrder(id);
      setOrder(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) return <LoadingSpinner message="Loading delivery details..." />;

  if (error) {
    return (
      <div className="card" style={{ padding: "var(--spacing-xl)" }}>
        <ErrorMessage error={error} onRetry={loadOrder} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card" style={{ padding: "var(--spacing-xl)" }}>
        Delivery order not found.
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => navigate("/shipper")}
            style={{ marginBottom: "var(--spacing-md)" }}
          >
            <ArrowLeft size={14} /> Back to deliveries
          </button>
          <h2 className="page-title">Delivery Order #{order.id}</h2>
          <p className="page-subtitle">
            Full delivery information for the order assigned to your shipper account.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <StatusBadge value={order.status} showIcon />
          <StatusBadge value={order.deliveryStatus || "pending"} showIcon />
          <StatusBadge value={order.paymentStatus || "unpaid"} showIcon />
          {shouldShowReturnPickupBadge(order) ? <ReturnPickupBadge /> : null}
        </div>
      </div>

      <div className="responsive-detail-grid">
        <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
          <section className="card" style={{ padding: "var(--spacing-lg)" }}>
            <SectionTitle title="Receiver" />
            <ContactRow icon={UserRound} label="Name" value={order.shipping?.receiverName || "—"} />
            <ContactRow icon={Phone} label="Phone" value={order.shipping?.receiverPhone || "—"} />
            <ContactRow icon={MapPin} label="Address" value={order.shipping?.fullAddress || "—"} />
          </section>

          <section className="card" style={{ padding: "var(--spacing-lg)" }}>
            <SectionTitle title="Items" aside={`${items.length} line(s)`} />
            <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
              {items.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)" }}>No item data.</div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="responsive-item-row"
                    style={{
                      paddingBottom: "var(--spacing-md)",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "var(--radius-md)",
                        background: "#f3f4f6",
                        overflow: "hidden",
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || `Product ${item.productId}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <div
                        style={{
                          color: "var(--color-dark)",
                          fontWeight: "var(--font-weight-semibold)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.productName || `Product #${item.productId}`}
                      </div>
                      <div
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-sm)",
                        }}
                      >
                        Product #{item.productId} · Qty {item.quantity}
                      </div>
                    </div>
                    <strong style={{ color: "var(--color-dark)" }}>
                      {formatCurrency(item.priceAtPurchase * item.quantity)}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside style={{ display: "grid", gap: "var(--spacing-lg)" }}>
          <section className="card" style={{ padding: "var(--spacing-lg)" }}>
            <SectionTitle title="Payment" />
            <InfoRow label="Gateway" value={order.paymentGateway || "—"} />
            <InfoRow
              label="Payment status"
              value={<StatusBadge value={order.paymentStatus || "unpaid"} />}
            />
            <InfoRow label="Shipping fee" value={formatCurrency(order.shippingFee)} />
            <InfoRow label="Order total" value={formatCurrency(order.totalAmount)} />
            <InfoRow label="Shipper collect" value={formatShipperCollectionAmount(order)} strong />
            <InfoRow
              label="Return request"
              value={
                order.latestRefundRequestStatus ? (
                  <StatusBadge value={order.latestRefundRequestStatus} />
                ) : (
                  "—"
                )
              }
            />
          </section>

          <section className="card" style={{ padding: "var(--spacing-lg)" }}>
            <SectionTitle title="Delivery Status" />
            <InfoRow label="Order status" value={<StatusBadge value={order.status} />} />
            <InfoRow
              label="Delivery status"
              value={<StatusBadge value={order.deliveryStatus || "pending"} />}
            />
            <InfoRow label="Fail count" value={String(order.deliveryFailCount || 0)} />
            <InfoRow label="Last fail reason" value={order.lastDeliveryFailedReason || "—"} />
            <InfoRow label="Partner" value={order.deliveryPartner || "—"} />
            <InfoRow label="Assigned at" value={formatDate(order.updatedAt)} />
          </section>

          <Link to="/shipper" className="btn-primary" style={{ textDecoration: "none" }}>
            Update delivery status
          </Link>
        </aside>
      </div>
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
        padding: "4px 12px",
        borderRadius: "var(--radius-sm)",
        background: "#ecfdf5",
        color: "#047857",
        border: "1px solid #10b98130",
        fontSize: "14px",
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

function getShipperCollectionAmount(order) {
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

function formatShipperCollectionAmount(order) {
  const amount = getShipperCollectionAmount(order);
  return amount > 0 ? formatCurrency(amount) : "No extra collection";
}

function SectionTitle({ title, aside }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--spacing-md)",
        alignItems: "center",
        marginBottom: "var(--spacing-md)",
      }}
    >
      <h3 style={{ margin: 0, color: "var(--color-dark)", fontSize: "var(--font-size-lg)" }}>
        {title}
      </h3>
      {aside ? (
        <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          {aside}
        </span>
      ) : null}
    </div>
  );
}

function ContactRow({ icon, label, value }) {
  const IconComponent = icon;

  return (
    <div
      className="responsive-contact-row"
      style={{
        marginBottom: "var(--spacing-sm)",
        color: "var(--color-text)",
      }}
    >
      <IconComponent size={17} color="var(--color-text-muted)" />
      <strong style={{ color: "var(--color-text-secondary)" }}>{label}</strong>
      <span style={{ overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div
      className="responsive-info-row"
      style={{
        padding: "9px 0",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span
        style={{
          color: "var(--color-dark)",
          fontWeight: strong ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
}
