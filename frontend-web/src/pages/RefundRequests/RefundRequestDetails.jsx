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
      <div style={{ marginBottom: '20px' }}>
        <Link to="/refund-requests" className="link">&larr; Back to Refund Requests</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Refund Request #{refundRequest.id}</h2>
        <StatusBadge value={refundRequest.status} style={{ fontSize: '14px', padding: '6px 16px' }} />
      </div>
      <p style={{ color: '#5f6368', marginBottom: '24px', fontSize: '14px' }}>
        Created on <strong>{refundRequest.createdAt ? new Date(refundRequest.createdAt).toLocaleString() : '—'}</strong>
        {refundRequest.updatedAt && refundRequest.updatedAt !== refundRequest.createdAt && (
          <> &middot; Updated <strong>{new Date(refundRequest.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#202124' }}>Update Refund Status</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
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
          <div style={{ marginTop: '10px', padding: '10px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', fontSize: '14px' }}>
            ✓ Refund request updated successfully
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>
            Refund Request Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div><strong>Order ID:</strong> {refundRequest.orderId || '—'}</div>
            <div><strong>Customer ID:</strong> {refundRequest.customerId || '—'}</div>
            <div><strong>Status:</strong> <StatusBadge value={refundRequest.status} /></div>
            <div><strong>Abuse Score Snapshot:</strong> {refundRequest.abuseScoreSnapshot ?? '—'}</div>
            <div>
              <strong>Review Note:</strong>{' '}
              <span style={{ color: refundRequest.reviewNote ? '#202124' : '#777' }}>
                {refundRequest.reviewNote || 'No review note yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>
            Evidence Image
          </h3>
          {refundRequest.imageUrl ? (
            <div>
              <a
                href={refundRequest.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="link"
                style={{ display: 'inline-block', marginBottom: '12px' }}
              >
                Open original image
              </a>
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', background: '#fafafa' }}>
                <img
                  src={refundRequest.imageUrl}
                  alt={`Refund evidence #${refundRequest.id}`}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '360px', objectFit: 'contain' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ color: '#777', fontSize: '14px' }}>No image evidence.</div>
          )}
        </div>
      </div>
    </div>
  );
}
