import { useEffect, useCallback } from 'react';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  danger = false,
}) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      onCancel();
    }
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 'var(--spacing-lg)',
        animation: 'fadeIn 0.15s ease-in-out',
      }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: 'var(--spacing-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3
            id="dialog-title"
            style={{
              margin: '0 0 var(--spacing-sm) 0',
              color: danger ? 'var(--color-danger)' : 'var(--color-dark)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            {title}
          </h3>
          <p
            id="dialog-message"
            style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
            }}
          >
            {message}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            autoFocus={!danger}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}
            autoFocus={danger}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
