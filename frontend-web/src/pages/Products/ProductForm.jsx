import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

function validateSKU(sku) {
  if (!sku || sku.trim() === '') return 'SKU is required';
  if (!/^[A-Z0-9-]+$/.test(sku)) return 'SKU must contain only uppercase letters, numbers, and hyphens';
  return null;
}

function validateName(name) {
  if (!name || name.trim() === '') return 'Name is required';
  return null;
}

function validateBasePrice(price) {
  if (price === '' || price === null || price === undefined) return 'Base price is required';
  const num = Number(price);
  if (isNaN(num) || num < 0) return 'Base price must be a non-negative number';
  if (!/^\d+(\.\d{0,2})?$/.test(String(price))) return 'Base price can have maximum 2 decimal places';
  return null;
}

function validateStockQty(qty) {
  if (qty === '' || qty === null || qty === undefined) return 'Stock quantity is required';
  const num = Number(qty);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) return 'Stock quantity must be a non-negative integer';
  return null;
}

function validateMinStockLevel(level) {
  if (level === '' || level === null || level === undefined) return 'Min stock level is required';
  const num = Number(level);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) return 'Min stock level must be a non-negative integer';
  return null;
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    basePrice: '',
    categoryId: '',
    stockQty: '',
    minStockLevel: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Load categories
  useEffect(() => {
    ApiService.getCategories()
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        setCategories([]);
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    if (isEditMode) {
      ApiService.getProduct(id)
        .then((data) => {
          setFormData({
            sku: data.sku || '',
            name: data.name || '',
            basePrice: data.basePrice || '',
            categoryId: data.categoryId || '',
            stockQty: data.stockQty || '',
            minStockLevel: data.minStockLevel || '',
          });
          setError(null);
        })
        .catch((err) => {
          if (err.code === 'NOT_FOUND') {
            setError({ code: 'NOT_FOUND', message: 'Product not found' });
            setTimeout(() => navigate('/products'), 2000);
          } else {
            setError(err);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate]);

  const validateField = (name, value) => {
    switch (name) {
      case 'sku':
        return validateSKU(value);
      case 'name':
        return validateName(value);
      case 'basePrice':
        return validateBasePrice(value);
      case 'stockQty':
        return validateStockQty(value);
      case 'minStockLevel':
        return validateMinStockLevel(value);
      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (isEditMode && key === 'sku') return; // Skip SKU validation in edit mode
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorField = Object.keys(errors).find((key) => errors[key]);
      if (firstErrorField) {
        document.getElementsByName(firstErrorField)[0]?.focus();
      }
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage('');

    const payload = {
      name: formData.name.trim(),
      basePrice: Number(formData.basePrice),
      categoryId: Number(formData.categoryId),
      stockQty: Number(formData.stockQty),
      minStockLevel: Number(formData.minStockLevel),
    };

    if (!isEditMode) {
      payload.sku = formData.sku.trim();
    }

    try {
      if (isEditMode) {
        await ApiService.updateProduct(id, payload);
        setSuccessMessage('Product updated successfully');
        setTimeout(() => navigate(`/products/${id}`), 1500);
      } else {
        const result = await ApiService.createProduct(payload);
        setSuccessMessage('Product created successfully');
        setTimeout(() => navigate(`/products/${result.id}`), 1500);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/products/${id}`);
    } else {
      navigate('/products');
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (loading) return <LoadingSpinner message="Loading product..." />;
  if (loadingCategories) return <LoadingSpinner message="Loading categories..." />;
  if (error && error.code === 'NOT_FOUND') return <ErrorMessage error={error} />;

  const hasErrors = Object.values(errors).some((err) => err !== null);

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#202124' }}>
        {isEditMode ? 'Edit Product' : 'Create New Product'}
      </h2>

      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠</span>
          <span>{error.message || 'An error occurred'}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '4px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* SKU */}
          <div>
            <label htmlFor="sku" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              SKU {!isEditMode && <span style={{ color: '#c62828' }}>*</span>}
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isEditMode || submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., TSHIRT-001"
            />
            {errors.sku && touched.sku && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.sku}</div>
            )}
            {isEditMode && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#5f6368' }}>SKU cannot be changed</div>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Name <span style={{ color: '#c62828' }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., Classic T-Shirt"
            />
            {errors.name && touched.name && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.name}</div>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Category <span style={{ color: '#c62828' }}>*</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              disabled={submitting || categories.length === 0}
              className="form-select"
              style={{ width: '100%' }}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#c62828' }}>
                No categories available. Please create a category first.
              </div>
            )}
          </div>

          {/* Base Price */}
          <div>
            <label htmlFor="basePrice" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Base Price (đ) <span style={{ color: '#c62828' }}>*</span>
            </label>
            <input
              type="number"
              id="basePrice"
              name="basePrice"
              value={formData.basePrice}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., 199000"
              step="0.01"
              min="0"
            />
            {errors.basePrice && touched.basePrice && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.basePrice}</div>
            )}
          </div>

          {/* Stock Quantity */}
          <div>
            <label htmlFor="stockQty" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Stock Quantity <span style={{ color: '#c62828' }}>*</span>
            </label>
            <input
              type="number"
              id="stockQty"
              name="stockQty"
              value={formData.stockQty}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., 20"
              step="1"
              min="0"
            />
            {errors.stockQty && touched.stockQty && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.stockQty}</div>
            )}
          </div>

          {/* Min Stock Level */}
          <div>
            <label htmlFor="minStockLevel" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Min Stock Level <span style={{ color: '#c62828' }}>*</span>
            </label>
            <input
              type="number"
              id="minStockLevel"
              name="minStockLevel"
              value={formData.minStockLevel}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., 5"
              step="1"
              min="0"
            />
            {errors.minStockLevel && touched.minStockLevel && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.minStockLevel}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || hasErrors}
            className="btn-primary"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
