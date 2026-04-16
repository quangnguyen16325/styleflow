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
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

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
    </div>
  );
}
