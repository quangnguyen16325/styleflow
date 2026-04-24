import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    let isActive = true;

    ApiService.getProducts()
      .then((data) => {
        if (isActive) {
          setProducts(Array.isArray(data) ? data : []);
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

  const categories = useMemo(() => {
    return ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.availableQty < p.minStockLevel).length;
  }, [products]);

  if (loading) return <LoadingSpinner message="Loading inventory..." />;
  if (error) return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;
  if (!products || products.length === 0) {
    return (
      <EmptyState 
        title="No Products" 
        description="Inventory is currently empty." 
        action={() => window.location.href = '/products/new'}
        actionLabel="Create First Product"
      />
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Inventory</h2>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <div className="page-header-actions">
          <Link to="/products/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            Create Product
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap',
      }}>
        <div className="card" style={{ padding: 'var(--spacing-md)', flex: '1', minWidth: '150px' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
            Total Products
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-dark)' }}>
            {products.length}
          </div>
        </div>
        {lowStockCount > 0 && (
          <div className="card" style={{ padding: 'var(--spacing-md)', flex: '1', minWidth: '150px', background: 'var(--color-danger-light)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
              Low Stock Alert
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-danger)' }}>
              {lowStockCount}
            </div>
          </div>
        )}
        <div className="card" style={{ padding: 'var(--spacing-md)', flex: '1', minWidth: '150px' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
            Filtered Results
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
            {filtered.length}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}
          aria-label="Search products"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-select"
          style={{ minWidth: '180px' }}
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        {(searchTerm || categoryFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('ALL');
            }}
            className="btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title="No matches" 
          description="No products match your search criteria. Try adjusting your filters."
          action={() => {
            setSearchTerm('');
            setCategoryFilter('ALL');
          }}
          actionLabel="Clear Filters"
        />
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Min Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => {
                const isLowStock = product.availableQty < product.minStockLevel;
                return (
                  <tr 
                    key={product.id} 
                    style={{ 
                      backgroundColor: isLowStock ? 'var(--color-warning-light)' : 'transparent' 
                    }}
                  >
                    <td>{product.id}</td>
                    <td>
                      <code style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        background: 'var(--color-bg)', 
                        padding: '2px 6px', 
                        borderRadius: 'var(--radius-sm)' 
                      }}>
                        {product.sku}
                      </code>
                    </td>
                    <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{product.name}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                        {product.category}
                      </span>
                    </td>
                    <td>{(product.basePrice || 0).toLocaleString()} đ</td>
                    <td>{product.stockQty}</td>
                    <td>{product.reservedQty}</td>
                    <td style={{ 
                      fontWeight: 'var(--font-weight-bold)', 
                      color: isLowStock ? 'var(--color-danger)' : 'var(--color-success)' 
                    }}>
                      {product.availableQty}
                      {isLowStock && <span style={{ marginLeft: '4px' }}>⚠️</span>}
                    </td>
                    <td>{product.minStockLevel}</td>
                    <td>
                      <Link to={`/products/${product.id}`} className="link">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
