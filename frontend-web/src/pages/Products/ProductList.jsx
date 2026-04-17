import { useEffect, useState } from 'react';
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
    ApiService.getProducts()
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading inventory..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!products || products.length === 0) return <EmptyState title="No Products" description="Inventory is currently empty." />;

  // Extract unique categories
  const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Filter logic
  const filtered = products.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(p => p.availableQty < p.minStockLevel).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Inventory Info</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/products/new" className="btn-primary">
            + Create Product
          </Link>
          {lowStockCount > 0 && (
            <span style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
              color: '#c62828', backgroundColor: '#ffebee',
            }}>
              ⚠ {lowStockCount} low stock
            </span>
          )}
          <span style={{ fontSize: '13px', color: '#5f6368' }}>{filtered.length} product(s)</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ width: '260px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-select"
          style={{ width: '180px' }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" description="No products match your search criteria." />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
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
                  <tr key={product.id} style={{ backgroundColor: isLowStock ? '#fff8e1' : 'transparent' }}>
                    <td>{product.id}</td>
                    <td><code style={{ fontSize: '13px', background: '#f1f3f4', padding: '2px 6px', borderRadius: '4px' }}>{product.sku}</code></td>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td><span style={{ textTransform: 'capitalize', color: '#5f6368' }}>{product.category}</span></td>
                    <td>{(product.basePrice || 0).toLocaleString()} đ</td>
                    <td>{product.stockQty}</td>
                    <td>{product.reservedQty}</td>
                    <td style={{ fontWeight: 'bold', color: isLowStock ? '#c62828' : '#2e7d32' }}>
                      {product.availableQty}
                    </td>
                    <td>{product.minStockLevel}</td>
                    <td>
                      <Link to={`/products/${product.id}`} className="link">
                        View Details
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
