import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    ApiService.getAdminCategories()
      .then((data) => {
        if (isActive) {
          setCategories(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (loading) return <LoadingSpinner message="Loading categories..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Categories</h2>
          <p className="page-subtitle">Manage product categories</p>
        </div>
        <div className="page-header-actions">
          <Link to="/categories/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            Create Category
          </Link>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState 
          title="No Categories" 
          description="No categories found. Create one to get started." 
          action={() => window.location.href = '/categories/new'}
          actionLabel="Create First Category"
        />
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr key={category.id}>
                  <td>{category.id}</td>
                  <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{category.name}</td>
                  <td>
                    <code style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      background: 'var(--color-bg)', 
                      padding: '2px 6px', 
                      borderRadius: 'var(--radius-sm)' 
                    }}>
                      {category.slug}
                    </code>
                  </td>
                  <td>{new Date(category.createdAt).toLocaleDateString()}</td>
                  <td>
                    {category.updatedAt 
                      ? new Date(category.updatedAt).toLocaleDateString() 
                      : '—'}
                  </td>
                  <td>
                    <Link to={`/categories/${category.id}`} className="link">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
