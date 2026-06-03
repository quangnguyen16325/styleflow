import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ApiService from "../../api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const INVENTORY_LOG_PAGE_SIZE = 50;

function resolveContentType(file) {
  if (file?.type) return file.type;
  const fileName = file?.name?.toLowerCase() || "";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  if (fileName.endsWith(".gif")) return "image/gif";
  return "";
}

function isAcceptedImageFile(file) {
  if (!file) return false;
  const normalizedType = (file.type || "").toLowerCase();
  if (normalizedType && ACCEPTED_IMAGE_TYPES.includes(normalizedType)) return true;
  const fileName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [inventoryTransactionTotal, setInventoryTransactionTotal] = useState(0);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const [stockInQuantity, setStockInQuantity] = useState("");
  const [stockInNote, setStockInNote] = useState("");
  const [stockInSubmitting, setStockInSubmitting] = useState(false);
  const [stockInError, setStockInError] = useState("");
  const [stockInSuccess, setStockInSuccess] = useState("");
  const [reviewInsights, setReviewInsights] = useState(null);
  const fileInputRef = useRef(null);

  const loadProductDetails = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      const [productData, transactionData, reviewInsightData] = await Promise.all([
        ApiService.getProduct(id),
        ApiService.getProductInventoryTransactions(id, {
          limit: INVENTORY_LOG_PAGE_SIZE,
          offset: 0,
        }),
        ApiService.getProductReviewInsights(id),
      ]);

      setProduct(productData);
      setInventoryTransactions(Array.isArray(transactionData?.items) ? transactionData.items : []);
      setInventoryTransactionTotal(Number(transactionData?.total ?? 0));
      setReviewInsights(reviewInsightData);
      setError(null);
    },
    [id],
  );

  useEffect(() => {
    let isActive = true;
    setLoading(true);

    loadProductDetails()
      .then(() => {
        if (isActive) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadProductDetails]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    setUploadError("");
    setUploadSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAcceptedImageFile(file)) {
      setSelectedFile(null);
      setUploadError("Invalid file type. Allowed: jpeg, png, webp, gif.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setUploadError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleUploadImage = async () => {
    if (!product || !selectedFile || uploading) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const contentType = resolveContentType(selectedFile);
    if (!contentType) {
      setUploadError("Could not detect file content type.");
      setUploading(false);
      return;
    }

    try {
      const result = await ApiService.uploadProductImage(product.id, selectedFile, contentType);
      setProduct(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadSuccess("Product image updated successfully.");
    } catch (err) {
      setUploadError(err.message || "Unable to upload and save product image.");
    } finally {
      setUploading(false);
    }
  };

  const handleStockInSubmit = async (event) => {
    event.preventDefault();
    if (!product || stockInSubmitting) return;

    const quantity = Number(stockInQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setStockInError("Quantity must be a positive integer.");
      setStockInSuccess("");
      return;
    }

    setStockInSubmitting(true);
    setStockInError("");
    setStockInSuccess("");

    try {
      const result = await ApiService.stockInProduct(product.id, {
        quantity,
        note: stockInNote.trim(),
      });

      if (result?.product) {
        setProduct(result.product);
      }

      setStockInQuantity("");
      setStockInNote("");
      setStockInSuccess(`Stock increased by ${quantity.toLocaleString("vi-VN")} unit(s).`);
      await loadProductDetails({ showLoading: false });
    } catch (err) {
      setStockInError(err.message || "Unable to stock in product.");
    } finally {
      setStockInSubmitting(false);
    }
  };

  const handleLoadMoreTransactions = async () => {
    if (loadingMoreTransactions) return;

    setLoadingMoreTransactions(true);
    try {
      const result = await ApiService.getProductInventoryTransactions(id, {
        limit: INVENTORY_LOG_PAGE_SIZE,
        offset: inventoryTransactions.length,
      });
      const nextItems = Array.isArray(result?.items) ? result.items : [];
      setInventoryTransactions((current) => [...current, ...nextItems]);
      setInventoryTransactionTotal(Number(result?.total ?? inventoryTransactionTotal));
    } catch (err) {
      setStockInError(err.message || "Unable to load older inventory logs.");
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await ApiService.deleteProduct(id);
      navigate("/products");
    } catch (err) {
      console.error("Delete error:", err);
      if (err.code === "CONFLICT") {
        setError({
          code: "CONFLICT",
          message: "Cannot delete product with active orders or reservations",
        });
      } else {
        setError(err);
      }
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  if (loading) return <LoadingSpinner message="Loading product details..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;
  if (!product) return null;

  const isLowStock = product.availableQty < product.minStockLevel;
  const canLoadMoreTransactions = inventoryTransactions.length < inventoryTransactionTotal;

  const metricCards = [
    {
      label: "Gross Stock",
      value: product.stockQty,
      bg: "var(--color-bg)",
      border: "var(--color-border)",
      color: "var(--color-dark)",
    },
    {
      label: "Reserved (Orders)",
      value: product.reservedQty,
      bg: "var(--color-bg)",
      border: "var(--color-border)",
      color: "var(--color-dark)",
    },
    {
      label: "Available To Sell",
      value: product.availableQty,
      bg: isLowStock ? "var(--color-warning-bg)" : "#e8f0fe",
      border: isLowStock ? "#ffc107" : "var(--color-border)",
      color: isLowStock ? "var(--color-danger)" : "var(--color-primary)",
    },
    {
      label: "Min Level Limit",
      value: product.minStockLevel,
      bg: "var(--color-bg)",
      border: "var(--color-border)",
      color: "var(--color-dark)",
    },
  ];

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <Link to="/products" className="link">
          &larr; Back to Inventory
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">{product.name}</h2>
          <p className="page-subtitle">SKU: {product.sku}</p>
        </div>
        <div className="page-header-actions">
          <Link
            to={`/products/${id}/edit`}
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="btn-danger"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <span
            style={{
              padding: "6px 14px",
              backgroundColor: isLowStock
                ? "var(--color-danger-light)"
                : "var(--color-success-light)",
              color: isLowStock ? "var(--color-danger)" : "var(--color-success)",
              borderRadius: "var(--radius-full)",
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--font-size-xs)",
              border: `1px solid ${isLowStock ? "var(--color-danger)" : "var(--color-success)"}`,
            }}
          >
            {isLowStock ? "⚠️ LOW STOCK" : "✓ IN STOCK"}
          </span>
        </div>
      </div>

      {/* Product Image */}
      <div
        className="card"
        style={{ padding: "var(--spacing-xl)", marginBottom: "var(--spacing-xl)" }}
      >
        <h3
          style={{
            margin: "0 0 var(--spacing-md) 0",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "var(--spacing-sm)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Product Image
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--spacing-lg)",
          }}
        >
          <div>
            <div
              style={{
                border: "1px dashed var(--color-border)",
                borderRadius: "var(--radius-md)",
                minHeight: "240px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-bg)",
                overflow: "hidden",
              }}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`${product.name} current`}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "320px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-sm)",
                    padding: "var(--spacing-lg)",
                    textAlign: "center",
                  }}
                >
                  No product image yet
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                wordBreak: "break-word",
              }}
            >
              {product.imageUrl || "Placeholder is displayed until an image is uploaded."}
            </div>
          </div>

          <div>
            <label htmlFor="product-image-upload" className="form-label">
              Select image (jpeg/png/webp/gif)
            </label>
            <input
              id="product-image-upload"
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              disabled={uploading}
              className="form-input"
              style={{ width: "100%", marginBottom: "var(--spacing-md)" }}
            />

            {selectedFile && (
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-dark)",
                  marginBottom: "var(--spacing-sm)",
                }}
              >
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}

            {previewUrl && (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--spacing-md)",
                  padding: "var(--spacing-xs)",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    marginBottom: "var(--spacing-xs)",
                  }}
                >
                  Preview
                </div>
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{
                    width: "100%",
                    maxHeight: "220px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  marginBottom: "var(--spacing-sm)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-danger)",
                  background: "var(--color-danger-bg)",
                  padding: "var(--spacing-sm)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  marginBottom: "var(--spacing-sm)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-success)",
                  background: "var(--color-success-bg)",
                  padding: "var(--spacing-sm)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {uploadSuccess}
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              disabled={uploading || !selectedFile}
              onClick={handleUploadImage}
            >
              {uploading ? "Uploading..." : "Upload & Save Image"}
            </button>
          </div>
        </div>
      </div>

      {/* General Info */}
      <div
        className="card"
        style={{ padding: "var(--spacing-xl)", marginBottom: "var(--spacing-xl)" }}
      >
        <h3
          style={{
            margin: "0 0 var(--spacing-md) 0",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "var(--spacing-sm)",
            fontSize: "var(--font-size-md)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          General Information
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--spacing-md)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <div>
            <strong>ID:</strong> {product.id}
          </div>
          <div>
            <strong>SKU:</strong>{" "}
            <code
              style={{
                fontSize: "var(--font-size-sm)",
                background: "var(--color-bg)",
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {product.sku}
            </code>
          </div>
          <div>
            <strong>Category:</strong>{" "}
            <span style={{ textTransform: "capitalize" }}>{product.category}</span>
          </div>
          <div>
            <strong>Base Price:</strong>{" "}
            <span
              style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-semibold)" }}
            >
              {(product.basePrice || 0).toLocaleString()} đ
            </span>
          </div>
          <div>
            <strong>Created:</strong> {new Date(product.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* AI Review Insights */}
      <div
        className="card"
        style={{ padding: "var(--spacing-xl)", marginBottom: "var(--spacing-xl)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--spacing-md)",
            alignItems: "flex-start",
            marginBottom: "var(--spacing-md)",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "var(--spacing-sm)",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              AI Review Insights
            </h3>
            <p
              style={{
                margin: "var(--spacing-xs) 0 0 0",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Summary from visible customer reviews analyzed by the AI sentiment service.
            </p>
          </div>
          <Link
            to={`/reviews?productId=${product.id}`}
            className="link"
            style={{ fontSize: "var(--font-size-sm)" }}
          >
            View reviews
          </Link>
        </div>

        {!reviewInsights || reviewInsights.aiReviewCount === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            No AI-analyzed review is available for this product yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "var(--spacing-md)",
              }}
            >
              <InsightMetric
                label="AI Reviews"
                value={`${reviewInsights.aiReviewCount}/${reviewInsights.reviewCount}`}
                helper="analyzed / visible"
              />
              <InsightMetric
                label="Positive"
                value={formatPercent(
                  reviewInsights.sentiment?.positive,
                  reviewInsights.aiReviewCount,
                )}
                helper={`${reviewInsights.sentiment?.positive || 0} reviews`}
                tone="positive"
              />
              <InsightMetric
                label="Negative"
                value={formatPercent(
                  reviewInsights.sentiment?.negative,
                  reviewInsights.aiReviewCount,
                )}
                helper={`${reviewInsights.sentiment?.negative || 0} reviews`}
                tone="negative"
              />
              <InsightMetric
                label="Avg Rating"
                value={Number(reviewInsights.ratingAverage || 0).toFixed(1)}
                helper="visible reviews"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "var(--spacing-md)",
              }}
            >
              <AspectInsightList
                title="Praised Aspects"
                emptyText="No positive aspect detected."
                aspects={reviewInsights.topPositiveAspects}
                tone="positive"
              />
              <AspectInsightList
                title="Needs Attention"
                emptyText="No negative aspect detected."
                aspects={reviewInsights.topNegativeAspects}
                tone="negative"
              />
            </div>

            {Array.isArray(reviewInsights.recentNegativeReviews) &&
            reviewInsights.recentNegativeReviews.length > 0 ? (
              <div>
                <h4
                  style={{
                    margin: "0 0 var(--spacing-sm) 0",
                    fontSize: "var(--font-size-sm)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--color-dark)",
                  }}
                >
                  Recent Negative Reviews
                </h4>
                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                  {reviewInsights.recentNegativeReviews.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--spacing-md)",
                        background: "var(--color-bg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "var(--spacing-sm)",
                          marginBottom: "var(--spacing-xs)",
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                        }}
                      >
                        <span>
                          #{review.id} · {review.customerName || "Customer"} · {review.rating}★
                        </span>
                        <span>{formatDateTime(review.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-dark)" }}>
                        {review.comment || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Inventory Metrics */}
      <h3
        style={{
          margin: "0 0 var(--spacing-md) 0",
          fontSize: "var(--font-size-md)",
          color: "var(--color-dark)",
        }}
      >
        Inventory Metrics
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "var(--spacing-lg)",
        }}
      >
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="card"
            style={{ padding: "var(--spacing-lg)", background: card.bg, borderColor: card.border }}
          >
            <div
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-xs)",
                textTransform: "uppercase",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.4px",
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "var(--font-weight-bold)",
                marginTop: "var(--spacing-xs)",
                color: card.color,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Stock In */}
      <div
        className="card"
        style={{
          padding: "var(--spacing-xl)",
          marginTop: "var(--spacing-xl)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
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
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-dark)",
              }}
            >
              Stock In
            </h3>
            <p
              style={{
                margin: "var(--spacing-xs) 0 0 0",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Add received stock and keep an audit log for inventory control.
            </p>
          </div>
          <div
            style={{
              textAlign: "right",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Current gross stock
            <div
              style={{
                color: "var(--color-dark)",
                fontSize: "24px",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              {product.stockQty}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleStockInSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--spacing-md)",
            alignItems: "end",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          <div>
            <label htmlFor="stock-in-quantity" className="form-label">
              Quantity
            </label>
            <input
              id="stock-in-quantity"
              className="form-input"
              type="number"
              min="1"
              step="1"
              value={stockInQuantity}
              onChange={(event) => setStockInQuantity(event.target.value)}
              disabled={stockInSubmitting}
              placeholder="e.g. 50"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div>
            <label htmlFor="stock-in-note" className="form-label">
              Note
            </label>
            <input
              id="stock-in-note"
              className="form-input"
              type="text"
              maxLength={500}
              value={stockInNote}
              onChange={(event) => setStockInNote(event.target.value)}
              disabled={stockInSubmitting}
              placeholder="Supplier, invoice, batch, or reason"
              style={{ marginBottom: 0 }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={stockInSubmitting}>
            {stockInSubmitting ? "Saving..." : "Add Stock"}
          </button>
        </form>

        {stockInError && (
          <div
            style={{
              marginBottom: "var(--spacing-md)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-danger)",
              background: "var(--color-danger-bg)",
              padding: "var(--spacing-sm)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {stockInError}
          </div>
        )}

        {stockInSuccess && (
          <div
            style={{
              marginBottom: "var(--spacing-md)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-success)",
              background: "var(--color-success-bg)",
              padding: "var(--spacing-sm)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {stockInSuccess}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--spacing-md)",
            alignItems: "center",
            marginBottom: "var(--spacing-sm)",
          }}
        >
          <h4
            style={{
              margin: 0,
              color: "var(--color-dark)",
              fontSize: "var(--font-size-sm)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Recent Inventory Logs
          </h4>
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            Showing {inventoryTransactions.length} / {inventoryTransactionTotal}
          </span>
        </div>
        {inventoryTransactions.length === 0 ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            No inventory log has been recorded for this product.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Created By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {inventoryTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDateTime(transaction.createdAt)}</td>
                    <td>{transaction.type}</td>
                    <td
                      style={{
                        color:
                          transaction.changeAmount > 0
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      {formatSignedQuantity(transaction.changeAmount)}
                    </td>
                    <td>{transaction.createdBy || "—"}</td>
                    <td>{transaction.note || transaction.referenceId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canLoadMoreTransactions ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "var(--spacing-md)",
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleLoadMoreTransactions}
                  disabled={loadingMoreTransactions}
                >
                  {loadingMoreTransactions ? "Loading..." : "Load older logs"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}" (SKU: ${product.sku})? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
}

function formatSignedQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return "—";
  return quantity > 0 ? `+${quantity.toLocaleString("vi-VN")}` : quantity.toLocaleString("vi-VN");
}

function InsightMetric({ label, value, helper, tone = "default" }) {
  const colors = {
    positive: { bg: "#E6F4EA", color: "#1F7A3F" },
    negative: { bg: "#FDE8E8", color: "#B42318" },
    default: { bg: "var(--color-bg)", color: "var(--color-dark)" },
  };
  const color = colors[tone] || colors.default;

  return (
    <div
      style={{
        padding: "var(--spacing-md)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        background: color.bg,
      }}
    >
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-xs)",
          textTransform: "uppercase",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "var(--spacing-xs)",
          color: color.color,
          fontSize: "24px",
          fontWeight: "var(--font-weight-bold)",
        }}
      >
        {value}
      </div>
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
        {helper}
      </div>
    </div>
  );
}

function AspectInsightList({ title, aspects, emptyText, tone }) {
  const hasAspects = Array.isArray(aspects) && aspects.length > 0;

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-md)",
      }}
    >
      <h4
        style={{
          margin: "0 0 var(--spacing-sm) 0",
          fontSize: "var(--font-size-sm)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--color-dark)",
        }}
      >
        {title}
      </h4>
      {!hasAspects ? (
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {aspects.map((aspect) => (
            <span
              key={`${aspect.key}-${aspect.label}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "999px",
                background: tone === "negative" ? "#FDE8E8" : "#E6F4EA",
                color: tone === "negative" ? "#B42318" : "#1F7A3F",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {aspect.aspect || formatAiLabel(aspect.key)}
              <span style={{ opacity: 0.75 }}>×{aspect.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatPercent(value, total) {
  const numerator = Number(value || 0);
  const denominator = Number(total || 0);
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatAiLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
