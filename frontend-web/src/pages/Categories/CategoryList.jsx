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
    ApiService.getAdminCategories()
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading categories..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Categories</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/categories/new" className="btn-primary">
            + Create Category
          </Link>
          <span style={{ fontSize: '13px', color: '#5f6368' }}>{categories.length} category(ies)</span>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No Categories" description="No categories found. Create one to get started." />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr key={category.id}>
                  <td>{category.id}</td>
                  <td style={{ fontWeight: 500 }}>{category.name}</td>
                  <td><code style={{ fontSize: '13px', background: '#f1f3f4', padding: '2px 6px', borderRadius: '4px' }}>{category.slug}</code></td>
                  <td>{new Date(category.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/categories/${category.id}`} className="link">
                      View Details
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
