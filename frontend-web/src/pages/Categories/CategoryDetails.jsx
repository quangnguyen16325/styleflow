import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function CategoryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    ApiService.getCategory(id)
      .then((data) => {
        setCategory(data);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await ApiService.deleteCategory(id);
      navigate('/categories');
    } catch (err) {
      console.error('Delete error:', err);
      if (err.code === 'CONFLICT') {
        setError({ code: 'CONFLICT', message: 'Cannot delete category with existing products' });
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

  if (loading) return <LoadingSpinner message="Loading category details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!category) return null;

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/categories" className="link">&larr; Back to Categories</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ margin: 0, color: 'var(--color-dark)', fontSize: 'var(--font-size-2xl)' }}>{category.name}</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Link to={`/categories/${id}/edit`} className="btn-primary" style={{ textDecoration: 'none' }}>
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
        </div>
      </div>

      {/* Category Info */}
      <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
          Category Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
          <div><strong>ID:</strong> {category.id}</div>
          <div><strong>Name:</strong> {category.name}</div>
          <div><strong>Slug:</strong> <code style={{ fontSize: 'var(--font-size-sm)', background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{category.slug}</code></div>
          <div><strong>Created:</strong> {new Date(category.createdAt).toLocaleString()}</div>
          {category.updatedAt && (
            <div><strong>Updated:</strong> {new Date(category.updatedAt).toLocaleString()}</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Category"
        message={`Are you sure you want to delete "${category.name}"? This action cannot be undone. You cannot delete a category if it has products.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}
