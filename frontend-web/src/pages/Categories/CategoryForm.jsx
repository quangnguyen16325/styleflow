import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

function validateName(name) {
  if (!name || name.trim() === '') return 'Name is required';
  return null;
}

function validateSlug(slug) {
  if (!slug || slug.trim() === '') return 'Slug is required';
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Slug must contain only lowercase letters, numbers, and hyphens';
  return null;
}

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isEditMode) {
      ApiService.getCategory(id)
        .then((data) => {
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
          });
          setError(null);
        })
        .catch((err) => {
          if (err.code === 'NOT_FOUND') {
            setError({ code: 'NOT_FOUND', message: 'Category not found' });
            setTimeout(() => navigate('/categories'), 2000);
          } else {
            setError(err);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate]);

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return validateName(value);
      case 'slug':
        return validateSlug(value);
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
      slug: formData.slug.trim(),
    };

    try {
      if (isEditMode) {
        await ApiService.updateCategory(id, payload);
        setSuccessMessage('Category updated successfully');
        setTimeout(() => navigate(`/categories/${id}`), 1500);
      } else {
        const result = await ApiService.createCategory(payload);
        setSuccessMessage('Category created successfully');
        setTimeout(() => navigate(`/categories/${result.id}`), 1500);
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
      navigate(`/categories/${id}`);
    } else {
      navigate('/categories');
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (loading) return <LoadingSpinner message="Loading category..." />;
  if (error && error.code === 'NOT_FOUND') return <ErrorMessage error={error} />;

  const hasErrors = Object.values(errors).some((err) => err !== null);

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#202124' }}>
        {isEditMode ? 'Edit Category' : 'Create New Category'}
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
              placeholder="e.g., Apparel"
            />
            {errors.name && touched.name && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.name}</div>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
              Slug <span style={{ color: '#c62828' }}>*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="form-input"
              style={{ width: '100%' }}
              placeholder="e.g., apparel"
            />
            {errors.slug && touched.slug && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#c62828' }}>{errors.slug}</div>
            )}
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#5f6368' }}>
              URL-friendly identifier (lowercase, numbers, hyphens only)
            </div>
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
            {submitting ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
}
