import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import EmptyState from '../ui/EmptyState';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ApiService.getProducts()
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner message="Loading inventory..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!products || products.length === 0) return <EmptyState title="No Products" description="Inventory is currently empty." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Inventory Info</h2>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Min Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const isLowStock = product.availableQty < product.minStockLevel;
              return (
                <tr key={product.id} style={{ backgroundColor: isLowStock ? '#fff8e1' : 'transparent' }}>
                  <td>{product.id}</td>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.basePrice.toLocaleString()} đ</td>
                  <td>{product.stockQty}</td>
                  <td>{product.reservedQty}</td>
                  <td style={{ fontWeight: 'bold', color: isLowStock ? '#d32f2f' : '#2e7d32' }}>
                    {product.availableQty}
                  </td>
                  <td>{product.minStockLevel}</td>
                  <td>
                    <Link to={`/products/${product.id}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>
                      View Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
