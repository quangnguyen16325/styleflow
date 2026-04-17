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
    { label: 'Gross Stock', value: product.stockQty, bg: '#f8f9fa', border: '#e0e0e0', color: '#202124' },
    { label: 'Reserved (Orders)', value: product.reservedQty, bg: '#f8f9fa', border: '#e0e0e0', color: '#202124' },
    { label: 'Available To Sell', value: product.availableQty, bg: isLowStock ? '#fff8e1' : '#e8f0fe', border: isLowStock ? '#ffc107' : '#e0e0e0', color: isLowStock ? '#c62828' : '#1a73e8' },
    { label: 'Min Level Limit', value: product.minStockLevel, bg: '#f8f9fa', border: '#e0e0e0', color: '#202124' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/products" className="link">&larr; Back to Inventory</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>{product.name}</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to={`/products/${id}/edit`} className="btn-primary">
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
            backgroundColor: isLowStock ? '#ffebee' : '#e8f5e9',
            color: isLowStock ? '#c62828' : '#2e7d32',
            borderRadius: '16px',
            fontWeight: 600,
            fontSize: '12px',
          }}>
            {isLowStock ? '⚠ LOW STOCK' : '✓ IN STOCK'}
          </span>
        </div>
      </div>

      {/* Product Image */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>
          Product Image
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{
              border: '1px dashed #c2c7cc',
              borderRadius: '8px',
              minHeight: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8f9fa',
              overflow: 'hidden',
            }}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={`${product.name} current`}
                  style={{ width: '100%', height: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ color: '#5f6368', fontSize: '14px', padding: '16px', textAlign: 'center' }}>
                  No product image yet
                </div>
              )}
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#5f6368', wordBreak: 'break-word' }}>
              {product.imageUrl || 'Placeholder is displayed until an image is uploaded.'}
            </div>
          </div>

          <div>
            <label htmlFor="product-image-upload" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
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
              style={{ width: '100%', marginBottom: '12px' }}
            />

            {selectedFile && (
              <div style={{ fontSize: '13px', color: '#202124', marginBottom: '10px' }}>
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}

            {previewUrl && (
              <div style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                marginBottom: '12px',
                padding: '8px',
                background: '#ffffff',
              }}>
                <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px' }}>Preview</div>
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            {uploadError && (
              <div style={{ marginBottom: '10px', fontSize: '13px', color: '#c62828', background: '#ffebee', padding: '10px', borderRadius: '4px' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ marginBottom: '10px', fontSize: '13px', color: '#2e7d32', background: '#e8f5e9', padding: '10px', borderRadius: '4px' }}>
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
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>General Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '14px' }}>
          <div><strong>ID:</strong> {product.id}</div>
          <div><strong>SKU:</strong> <code style={{ fontSize: '13px', background: '#f1f3f4', padding: '2px 6px', borderRadius: '4px' }}>{product.sku}</code></div>
          <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{product.category}</span></div>
          <div><strong>Base Price:</strong> <span style={{ color: '#1a73e8', fontWeight: 600 }}>{(product.basePrice || 0).toLocaleString()} đ</span></div>
          <div><strong>Created:</strong> {new Date(product.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Inventory Metrics */}
      <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#202124' }}>Inventory Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
        {metricCards.map((card) => (
          <div key={card.label} className="card" style={{ padding: '20px', background: card.bg, borderColor: card.border }}>
            <div style={{ color: '#5f6368', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.4px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: card.color }}>
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
