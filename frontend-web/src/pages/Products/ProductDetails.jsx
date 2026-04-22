import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function resolveContentType(file) {
  if (file?.type) return file.type;
  const fileName = file?.name?.toLowerCase() || '';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.gif')) return 'image/gif';
  return '';
}

function isAcceptedImageFile(file) {
  if (!file) return false;
  const normalizedType = (file.type || '').toLowerCase();
  if (normalizedType && ACCEPTED_IMAGE_TYPES.includes(normalizedType)) return true;
  const fileName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    ApiService.getProduct(id)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setUploadError('');
    setUploadSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAcceptedImageFile(file)) {
      setSelectedFile(null);
      setUploadError('Invalid file type. Allowed: jpeg, png, webp, gif.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadImage = async () => {
    if (!product || !selectedFile || uploading) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const contentType = resolveContentType(selectedFile);
    if (!contentType) {
      setUploadError('Could not detect file content type.');
      setUploading(false);
      return;
    }

    let presignPayload;
    try {
      presignPayload = await ApiService.createProductUploadPresign(product.id, selectedFile.name, contentType);
      if (!presignPayload?.uploadUrl || !presignPayload?.publicUrl) {
        throw new Error('Missing upload URL or public URL in presign response.');
      }
    } catch (err) {
      setUploadError(`Presign failed: ${err.message || 'Unable to create upload URL.'}`);
      setUploading(false);
      return;
    }

    try {
      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Storage returned status ${uploadResponse.status}`);
      }
    } catch (err) {
      setUploadError(`Upload failed: ${err.message || 'Unable to upload file to storage.'}`);
      setUploading(false);
      return;
    }

    try {
      await ApiService.updateProductImage(product.id, presignPayload.publicUrl);
      setProduct((prev) => (prev ? { ...prev, imageUrl: presignPayload.publicUrl } : prev));
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadSuccess('Product image updated successfully.');
    } catch (err) {
      setUploadError(`Save image failed: ${err.message || 'Unable to update product image.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await ApiService.deleteProduct(id);
      navigate('/products');
    } catch (err) {
      console.error('Delete error:', err);
      if (err.code === 'CONFLICT') {
        setError({ code: 'CONFLICT', message: 'Cannot delete product with active orders or reservations' });
      } else {
        setError(err);
      }
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  if (loading) return <LoadingSpinner message="Loading product details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!product) return null;

  const isLowStock = product.availableQty < product.minStockLevel;

  const metricCards = [
    { label: 'Gross Stock', value: product.stockQty, bg: 'var(--color-bg)', border: 'var(--color-border)', color: 'var(--color-dark)' },
    { label: 'Reserved (Orders)', value: product.reservedQty, bg: 'var(--color-bg)', border: 'var(--color-border)', color: 'var(--color-dark)' },
    { label: 'Available To Sell', value: product.availableQty, bg: isLowStock ? 'var(--color-warning-bg)' : '#e8f0fe', border: isLowStock ? '#ffc107' : 'var(--color-border)', color: isLowStock ? 'var(--color-danger)' : 'var(--color-primary)' },
    { label: 'Min Level Limit', value: product.minStockLevel, bg: 'var(--color-bg)', border: 'var(--color-border)', color: 'var(--color-dark)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/products" className="link">&larr; Back to Inventory</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ margin: 0, color: 'var(--color-dark)', fontSize: 'var(--font-size-2xl)' }}>{product.name}</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <Link to={`/products/${id}/edit`} className="btn-primary" style={{ textDecoration: 'none' }}>
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="btn-danger"
            disabled={deleting}
          >
            Delete
          </button>
          <span style={{
            padding: '6px 14px',
            backgroundColor: isLowStock ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            color: isLowStock ? 'var(--color-danger)' : 'var(--color-success)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-xs)',
          }}>
            {isLowStock ? 'LOW STOCK' : 'IN STOCK'}
          </span>
        </div>
      </div>

      {/* Product Image */}
      <div className="card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
          Product Image
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-lg)' }}>
          <div>
            <div style={{
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              minHeight: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-bg)',
              overflow: 'hidden',
            }}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`${product.name} current`}
                  style={{ width: '100%', height: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                  No product image yet
                </div>
              )}
            </div>
            <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
              {product.imageUrl || 'Placeholder is displayed until an image is uploaded.'}
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
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleFileChange}
              disabled={uploading}
              className="form-input"
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
            />

            {selectedFile && (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-dark)', marginBottom: 'var(--spacing-sm)' }}>
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}

            {previewUrl && (
              <div style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-xs)',
                background: '#ffffff',
              }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Preview</div>
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            {uploadError && (
              <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                {uploadSuccess}
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              disabled={uploading || !selectedFile}
              onClick={handleUploadImage}
            >
              {uploading ? 'Uploading...' : 'Upload & Save Image'}
            </button>
          </div>
        </div>
      </div>

      {/* General Info */}
      <div className="card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>General Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
          <div><strong>ID:</strong> {product.id}</div>
          <div><strong>SKU:</strong> <code style={{ fontSize: 'var(--font-size-sm)', background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{product.sku}</code></div>
          <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{product.category}</span></div>
          <div><strong>Base Price:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)' }}>{(product.basePrice || 0).toLocaleString()} đ</span></div>
          <div><strong>Created:</strong> {new Date(product.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Inventory Metrics */}
      <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Inventory Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {metricCards.map((card) => (
          <div key={card.label} className="card" style={{ padding: 'var(--spacing-lg)', background: card.bg, borderColor: card.border }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.4px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'var(--font-weight-bold)', marginTop: 'var(--spacing-xs)', color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
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
