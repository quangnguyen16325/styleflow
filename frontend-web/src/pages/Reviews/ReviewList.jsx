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

const AI_OVERALL_OPTIONS = [
  { value: "ALL", label: "All AI Sentiments" },
  { value: "POSITIVE", label: "AI Positive" },
  { value: "NEGATIVE", label: "AI Negative" },
  { value: "NEUTRAL", label: "AI Neutral" },
];

const AI_ASPECT_OPTIONS = [
  { value: "ALL", label: "All Aspects" },
  { value: "material", label: "Material" },
  { value: "design", label: "Design" },
  { value: "price", label: "Price" },
  { value: "service", label: "Service" },
  { value: "general", label: "General" },
];

const AI_ASPECT_LABEL_OPTIONS = [
  { value: "ALL", label: "All Aspect Labels" },
  { value: "POSITIVE", label: "Aspect Positive" },
  { value: "NEGATIVE", label: "Aspect Negative" },
  { value: "NEUTRAL", label: "Aspect Neutral" },
  { value: "NO_ASPECT", label: "No Aspect" },
];

const AI_OVERALL_VALUES = AI_OVERALL_OPTIONS.map((option) => option.value);
const AI_ASPECT_VALUES = AI_ASPECT_OPTIONS.map((option) => option.value);
const AI_ASPECT_LABEL_VALUES = AI_ASPECT_LABEL_OPTIONS.map((option) => option.value);

export default function ReviewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = normalizeFilterValue(searchParams.get("status"), STATUS_VALUES);
  const aiOverallFilter = normalizeFilterValue(searchParams.get("aiOverall"), AI_OVERALL_VALUES);
  const aiAspectFilter = normalizeFilterValue(searchParams.get("aiAspect"), AI_ASPECT_VALUES);
  const aiAspectLabelFilter = normalizeFilterValue(
    searchParams.get("aiAspectLabel"),
    AI_ASPECT_LABEL_VALUES,
  );
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    setError(null);

    ApiService.getReviews({
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      aiOverall: aiOverallFilter !== "ALL" ? aiOverallFilter : undefined,
      aiAspect: aiAspectFilter !== "ALL" ? aiAspectFilter : undefined,
      aiAspectLabel: aiAspectLabelFilter !== "ALL" ? aiAspectLabelFilter : undefined,
      limit: 100,
    })
      .then((data) => {
        setReviews(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [aiAspectFilter, aiAspectLabelFilter, aiOverallFilter, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const visibleCount = useMemo(
    () => reviews.filter((review) => review.status === "visible").length,
    [reviews],
  );

  const handleFilterChange = (key, nextValue) => {
    setLoading(true);
    setError(null);

    const nextParams = new URLSearchParams(searchParams);
    if (nextValue === "ALL") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValue);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateReviewStatus = async (review, status) => {
    let hiddenReason = null;

    if (status === "hidden") {
      hiddenReason = window.prompt("Reason for hiding this review?", "");
      if (hiddenReason === null) {
        return;
      }
      hiddenReason = hiddenReason.trim();
    }

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
          onChange={(event) => handleFilterChange("status", event.target.value)}
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
        <select
          value={aiOverallFilter}
          onChange={(event) => handleFilterChange("aiOverall", event.target.value)}
          className="form-select"
          style={{ width: "220px" }}
          aria-label="Filter reviews by AI sentiment"
        >
          {AI_OVERALL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={aiAspectFilter}
          onChange={(event) => handleFilterChange("aiAspect", event.target.value)}
          className="form-select"
          style={{ width: "190px" }}
          aria-label="Filter reviews by AI aspect"
        >
          {AI_ASPECT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={aiAspectLabelFilter}
          onChange={(event) => handleFilterChange("aiAspectLabel", event.target.value)}
          className="form-select"
          style={{ width: "220px" }}
          aria-label="Filter reviews by AI aspect label"
        >
          {AI_ASPECT_LABEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
            <table style={{ minWidth: "1260px" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>AI</th>
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
                    <td style={{ minWidth: "210px" }}>
                      <ReviewAiSummary aiAnalysis={review.aiAnalysis} />
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

function ReviewAiSummary({ aiAnalysis }) {
  if (!aiAnalysis?.overall?.label) {
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        Not analyzed
      </span>
    );
  }

  const usefulAspects = Array.isArray(aiAnalysis.aspects)
    ? aiAnalysis.aspects.filter((aspect) => aspect.label && aspect.label !== "NO_ASPECT")
    : [];

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <AiBadge label={aiAnalysis.overall.label} />
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
          {formatConfidence(aiAnalysis.overall.confidence)}
        </span>
      </div>
      {usefulAspects.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {usefulAspects.slice(0, 4).map((aspect) => (
            <AiBadge
              key={`${aspect.key}-${aspect.label}`}
              label={aspect.label}
              text={`${aspect.aspect || aspect.key}: ${formatAiLabel(aspect.label)}`}
              compact
            />
          ))}
        </div>
      ) : (
        <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
          No clear aspect
        </span>
      )}
    </div>
  );
}

function AiBadge({ label, text = null, compact = false }) {
  const normalized = String(label || "").toUpperCase();
  const tone = getAiTone(normalized);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "3px 8px" : "5px 10px",
        borderRadius: "999px",
        backgroundColor: tone.bg,
        color: tone.color,
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-bold)",
        lineHeight: 1.2,
      }}
    >
      {text || formatAiLabel(normalized)}
    </span>
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

function formatAiLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(value) {
  const confidence = Number(value || 0);
  return confidence > 0 ? `${Math.round(confidence * 100)}%` : "—";
}

function getAiTone(label) {
  if (label === "POSITIVE") {
    return { bg: "#E6F4EA", color: "#1F7A3F" };
  }

  if (label === "NEGATIVE") {
    return { bg: "#FDE8E8", color: "#B42318" };
  }

  if (label === "NEUTRAL") {
    return { bg: "#FFF4D6", color: "#925F00" };
  }

  return { bg: "#EEF2F6", color: "#475467" };
}
