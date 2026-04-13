import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ApiService.getProduct(id)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading product details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!product) return null;

  const isLowStock = product.availableQty < product.minStockLevel;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/products" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>&larr; Back to Inventory</Link>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Product: {product.name}</h2>
        <span style={{ 
          padding: '6px 12px', 
          backgroundColor: isLowStock ? '#ffebee' : '#e8f5e9', 
          color: isLowStock ? '#c62828' : '#2e7d32',
          borderRadius: '16px',
          fontWeight: 'bold',
          fontSize: '12px'
        }}>
          {isLowStock ? 'LOW STOCK WARNING' : 'IN STOCK'}
        </span>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>General Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'recap repeat(2, 1fr)', gap: '15px', marginBottom: '30px' }}>
          <div><strong>ID:</strong> {product.id}</div>
          <div><strong>SKU:</strong> {product.sku}</div>
          <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{product.category}</span></div>
          <div><strong>Base Price:</strong> {product.basePrice.toLocaleString()} đ</div>
          <div><strong>Created At:</strong> {new Date(product.createdAt).toLocaleString()}</div>
        </div>
        
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>Inventory Metrics</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
            <div style={{ color: '#5f6368', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Gross Stock</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{product.stockQty}</div>
          </div>
          <div style={{ flex: 1, padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
            <div style={{ color: '#5f6368', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Reserved (Orders)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{product.reservedQty}</div>
          </div>
          <div style={{ flex: 1, padding: '15px', background: isLowStock ? '#fff8e1' : '#e8f0fe', borderRadius: '6px', border: isLowStock ? '1px solid #ffc107' : '1px solid #e0e0e0' }}>
            <div style={{ color: '#5f6368', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Available To Sell</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: isLowStock ? '#d32f2f' : '#1a73e8' }}>{product.availableQty}</div>
          </div>
          <div style={{ flex: 1, padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
            <div style={{ color: '#5f6368', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Min Level Limit</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{product.minStockLevel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
