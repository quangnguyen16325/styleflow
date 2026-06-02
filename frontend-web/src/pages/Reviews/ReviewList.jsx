import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ApiService from "../../api";
import EmptyState from "../../components/ui/EmptyState";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";

const REVIEW_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "deleted", label: "Deleted" },
];

const STATUS_VALUES = REVIEW_STATUSES.map((status) => status.value);

export default function ReviewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = normalizeFilterValue(searchParams.get("status"), STATUS_VALUES);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    setError(null);

    ApiService.getReviews({
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      limit: 100,
    })
      .then((data) => {
        setReviews(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const visibleCount = useMemo(
    () => reviews.filter((review) => review.status === "visible").length,
    [reviews],
  );

  const handleStatusChange = (nextStatus) => {
    setLoading(true);
    setError(null);

    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === "ALL") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateReviewStatus = async (review, status) => {
    const hiddenReason =
      status === "hidden" ? window.prompt("Reason for hiding this review?", "") || "" : null;

    try {
      setUpdatingId(review.id);
      await ApiService.updateReviewStatus(review.id, { status, hiddenReason });
      fetchReviews();
    } catch (err) {
      window.alert(err?.message || "Failed to update review status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading product reviews..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchReviews} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h2>Product Reviews</h2>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            {reviews.length} reviews · {visibleCount} visible
          </span>
        </div>
      </div>

      <div
        style={{
          marginBottom: "var(--spacing-lg)",
          display: "flex",
          gap: "var(--spacing-sm)",
          flexWrap: "wrap",
        }}
      >
        <select
          value={statusFilter}
          onChange={(event) => handleStatusChange(event.target.value)}
          className="form-select"
          style={{ width: "220px" }}
          aria-label="Filter reviews by status"
        >
          {REVIEW_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="No Reviews Found"
          description="No product reviews match your current filter."
        />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ minWidth: "1040px" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td style={{ fontWeight: "var(--font-weight-bold)" }}>#{review.id}</td>
                    <td>
                      <Link to={`/products/${review.productId}`} className="link">
                        {review.productName || `Product #${review.productId}`}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                        {review.customerName || `Customer #${review.customerId}`}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {review.customerEmail || "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#d99152", fontWeight: "var(--font-weight-bold)" }}>
                        {"★".repeat(review.rating)}
                        {"☆".repeat(Math.max(0, 5 - review.rating))}
                      </span>
                    </td>
                    <td style={{ maxWidth: "280px", whiteSpace: "normal" }}>
                      {review.comment || "—"}
                      {review.hiddenReason ? (
                        <div
                          style={{
                            marginTop: "var(--spacing-xs)",
                            color: "var(--color-warning)",
                            fontSize: "var(--font-size-xs)",
                          }}
                        >
                          Hidden: {review.hiddenReason}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {Array.isArray(review.images) && review.images.length > 0 ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {review.images.slice(0, 3).map((image) => (
                            <a key={image} href={image} target="_blank" rel="noreferrer">
                              <img
                                src={image}
                                alt="Review"
                                style={{
                                  width: "42px",
                                  height: "42px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid var(--color-border)",
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <StatusBadge value={review.status} />
                    </td>
                    <td
                      style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}
                    >
                      {review.createdAt ? new Date(review.createdAt).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {review.status !== "visible" ? (
                          <button
                            className="btn-secondary btn-sm"
                            disabled={updatingId === review.id}
                            onClick={() => updateReviewStatus(review, "visible")}
                          >
                            Show
                          </button>
                        ) : null}
                        {review.status !== "hidden" ? (
                          <button
                            className="btn-secondary btn-sm"
                            disabled={updatingId === review.id}
                            onClick={() => updateReviewStatus(review, "hidden")}
                          >
                            Hide
                          </button>
                        ) : null}
                        {review.status !== "deleted" ? (
                          <button
                            className="btn-danger btn-sm"
                            disabled={updatingId === review.id}
                            onClick={() => updateReviewStatus(review, "deleted")}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeFilterValue(value, allowedValues) {
  if (!value) {
    return "ALL";
  }

  const normalized = value.trim().toLowerCase();
  const matchedValue = allowedValues.find((allowed) => allowed.toLowerCase() === normalized);
  return matchedValue || "ALL";
}
