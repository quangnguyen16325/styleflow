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
  { value: "deleted", label: "Archived" },
];

const STATUS_VALUES = REVIEW_STATUSES.map((status) => status.value);
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

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

const ATTENTION_OPTIONS = [
  { value: "ALL", label: "All Review Priority" },
  { value: "true", label: "Needs Attention" },
];
const ATTENTION_VALUES = ATTENTION_OPTIONS.map((option) => option.value);

export default function ReviewList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = normalizeFilterValue(searchParams.get("status"), STATUS_VALUES);
  const aiOverallFilter = normalizeFilterValue(searchParams.get("aiOverall"), AI_OVERALL_VALUES);
  const aiAspectFilter = normalizeFilterValue(searchParams.get("aiAspect"), AI_ASPECT_VALUES);
  const aiAspectLabelFilter = normalizeFilterValue(
    searchParams.get("aiAspectLabel"),
    AI_ASPECT_LABEL_VALUES,
  );
  const attentionFilter = normalizeFilterValue(
    searchParams.get("needsAttention"),
    ATTENTION_VALUES,
  );
  const productIdFilter = normalizePositiveInteger(searchParams.get("productId"));
  const page = normalizePositiveInteger(searchParams.get("page")) || 1;
  const rowsPerPage = normalizeRowsPerPage(searchParams.get("limit"));
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [aiBackfillRunning, setAiBackfillRunning] = useState(false);
  const [aiBackfillResult, setAiBackfillResult] = useState(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    setError(null);

    ApiService.getReviews({
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      aiOverall: aiOverallFilter !== "ALL" ? aiOverallFilter : undefined,
      aiAspect: aiAspectFilter !== "ALL" ? aiAspectFilter : undefined,
      aiAspectLabel: aiAspectLabelFilter !== "ALL" ? aiAspectLabelFilter : undefined,
      needsAttention: attentionFilter !== "ALL" ? attentionFilter : undefined,
      productId: productIdFilter || undefined,
      limit: rowsPerPage,
      offset: (page - 1) * rowsPerPage,
    })
      .then((data) => {
        setReviews(Array.isArray(data?.items) ? data.items : []);
        setTotalReviews(Number(data?.total ?? 0));
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [
    aiAspectFilter,
    aiAspectLabelFilter,
    aiOverallFilter,
    attentionFilter,
    page,
    productIdFilter,
    rowsPerPage,
    statusFilter,
  ]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const visibleCount = useMemo(
    () => reviews.filter((review) => review.status === "visible").length,
    [reviews],
  );
  const totalPages = Math.max(1, Math.ceil(totalReviews / rowsPerPage));
  const pageStart = totalReviews === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(page * rowsPerPage, totalReviews);

  const handleFilterChange = (key, nextValue) => {
    setLoading(true);
    setError(null);

    const nextParams = new URLSearchParams(searchParams);
    if (nextValue === "ALL") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValue);
    }
    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  };

  const handlePageChange = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextParams = new URLSearchParams(searchParams);
    if (safePage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(safePage));
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleRowsPerPageChange = (nextLimit) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("limit", String(nextLimit));
    nextParams.delete("page");
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

  const handleAiBackfill = async () => {
    const confirmed = window.confirm(
      "Analyze product reviews that do not have AI results yet? This will process up to 100 reviews.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setAiBackfillRunning(true);
      setAiBackfillResult(null);
      const result = await ApiService.backfillReviewAi({ limit: 100 });
      setAiBackfillResult(result);
      fetchReviews();
    } catch (err) {
      window.alert(err?.message || "Failed to analyze missing review AI results");
    } finally {
      setAiBackfillRunning(false);
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
            Showing {pageStart}-{pageEnd} of {totalReviews} reviews · {visibleCount} visible on this
            page
            {productIdFilter ? ` · product #${productIdFilter}` : ""}
          </span>
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={handleAiBackfill}
          disabled={aiBackfillRunning}
        >
          {aiBackfillRunning ? "Analyzing..." : "Analyze Missing AI"}
        </button>
      </div>

      {aiBackfillResult ? (
        <div
          className="card"
          style={{
            marginBottom: "var(--spacing-lg)",
            padding: "var(--spacing-md)",
            color:
              aiBackfillResult.failed > 0 ? "var(--color-danger)" : "var(--color-text-secondary)",
          }}
        >
          AI analysis completed: scanned {aiBackfillResult.scanned}, analyzed{" "}
          {aiBackfillResult.analyzed}, skipped {aiBackfillResult.skipped}, failed{" "}
          {aiBackfillResult.failed}.
        </div>
      ) : null}

      <div
        className="card"
        style={{
          marginBottom: "var(--spacing-lg)",
          padding: "var(--spacing-md)",
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
          display: "grid",
          gap: "6px",
        }}
      >
        <div>
          <strong>Visible</strong>: shown to customers. <strong>Hidden</strong>: temporarily hidden
          and can be shown again. <strong>Archived</strong>: soft-deleted from public display and
          can be restored.
        </div>
        <div>Rows with a soft orange highlight are flagged by AI for moderation review.</div>
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
          value={attentionFilter}
          onChange={(event) => handleFilterChange("needsAttention", event.target.value)}
          className="form-select"
          style={{ width: "220px" }}
          aria-label="Filter reviews by moderation priority"
        >
          {ATTENTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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

      <div
        style={{
          marginBottom: "var(--spacing-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--spacing-md)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          Page {page} / {totalPages}
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Rows per page
          <select
            value={rowsPerPage}
            onChange={(event) => handleRowsPerPageChange(Number(event.target.value))}
            className="form-select"
            style={{ width: "100px", marginBottom: 0 }}
            aria-label="Rows per page"
          >
            {ROWS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
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
                {reviews.map((review) => {
                  const needsAttention = isReviewAiNeedsAttention(review.aiAnalysis);
                  return (
                    <tr
                      key={review.id}
                      style={
                        needsAttention
                          ? {
                              backgroundColor: "#FFF9E8",
                              boxShadow: "inset 4px 0 0 #D99152",
                            }
                          : undefined
                      }
                    >
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
                        <StatusBadge
                          value={review.status === "deleted" ? "archived" : review.status}
                        />
                      </td>
                      <td style={{ minWidth: "210px" }}>
                        <ReviewAiSummary aiAnalysis={review.aiAnalysis} />
                      </td>
                      <td
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-muted)",
                        }}
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
                              Archive
                            </button>
                          ) : (
                            <button
                              className="btn-secondary btn-sm"
                              disabled={updatingId === review.id}
                              onClick={() => updateReviewStatus(review, "visible")}
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--spacing-md)",
              flexWrap: "wrap",
              padding: "var(--spacing-md)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              Showing {pageStart}-{pageEnd} of {totalReviews}
            </span>
            <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
              <span
                style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}
              >
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
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

function isReviewAiNeedsAttention(aiAnalysis) {
  if (String(aiAnalysis?.overall?.label || "").toUpperCase() === "NEGATIVE") {
    return true;
  }

  return Array.isArray(aiAnalysis?.aspects)
    ? aiAnalysis.aspects.some((aspect) => String(aspect.label || "").toUpperCase() === "NEGATIVE")
    : false;
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

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeRowsPerPage(value) {
  const parsed = Number(value);
  return ROWS_PER_PAGE_OPTIONS.includes(parsed) ? parsed : 25;
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
