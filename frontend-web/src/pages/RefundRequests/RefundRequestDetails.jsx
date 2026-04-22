import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StatusBadge from '../../components/ui/StatusBadge';

const REFUND_STATUSES = [
  'pending',
  'manual_review_required',
  'approved',
  'rejected',
  'refunded',
];

export default function RefundRequestDetails() {
  const { id } = useParams();
  const [refundRequest, setRefundRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newStatus, setNewStatus] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    ApiService.getRefundRequest(id)
      .then((data) => {
        setRefundRequest(data);
        setNewStatus(data.status);
        setReviewNote(data.reviewNote || '');
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!refundRequest) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const updated = await ApiService.updateRefundRequestStatus(id, newStatus, reviewNote);
      setRefundRequest(updated);
      setReviewNote(updated.reviewNote || '');
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading refund request details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!refundRequest) return null;

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/refund-requests" className="link">&larr; Back to Refund Requests</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
        <h2 style={{ margin: 0, color: 'var(--color-dark)', fontSize: 'var(--font-size-2xl)' }}>Refund Request #{refundRequest.id}</h2>
        <StatusBadge value={refundRequest.status} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }} />
      </div>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-sm)' }}>
        Created on <strong>{refundRequest.createdAt ? new Date(refundRequest.createdAt).toLocaleString() : '—'}</strong>
        {refundRequest.updatedAt && refundRequest.updatedAt !== refundRequest.createdAt && (
          <> &middot; Updated <strong>{new Date(refundRequest.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Update Refund Status</h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select"
            style={{ width: '240px' }}
          >
            {REFUND_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Review note (optional)"
            className="form-input"
            style={{ flex: 1, minWidth: '260px' }}
          />
          <button className="btn-primary" onClick={handleUpdateStatus} disabled={updating}>
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>

        {updateError && <ErrorMessage error={updateError} />}
        {updateSuccess && (
          <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
            Refund request updated successfully
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
            Refund Request Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
            <div><strong>Order ID:</strong> {refundRequest.orderId || '—'}</div>
            <div><strong>Customer ID:</strong> {refundRequest.customerId || '—'}</div>
            <div><strong>Status:</strong> <StatusBadge value={refundRequest.status} /></div>
            <div><strong>Abuse Score Snapshot:</strong> {refundRequest.abuseScoreSnapshot ?? '—'}</div>
            <div>
              <strong>Review Note:</strong>{' '}
              <span style={{ color: refundRequest.reviewNote ? 'var(--color-dark)' : 'var(--color-text-muted)' }}>
                {refundRequest.reviewNote || 'No review note yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
            Evidence Image
          </h3>
          {refundRequest.imageUrl ? (
            <div>
              <a
                href={refundRequest.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="link"
                style={{ display: 'inline-block', marginBottom: 'var(--spacing-md)' }}
              >
                Open original image
              </a>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-bg)' }}>
                <img
                  src={refundRequest.imageUrl}
                  alt={`Refund evidence #${refundRequest.id}`}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '360px', objectFit: 'contain' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No image evidence.</div>
          )}
        </div>
      </div>
    </div>
  );
}
