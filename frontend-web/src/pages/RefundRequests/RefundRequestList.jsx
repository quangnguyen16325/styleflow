import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

const REFUND_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'manual_review_required', label: 'Manual Review Required' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
];

export default function RefundRequestList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedStatuses = REFUND_STATUSES.map((item) => item.value);
  const statusFromQuery = normalizeFilterValue(searchParams.get('status'), allowedStatuses);
  const statusFilter = statusFromQuery;

  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    ApiService.getRefundRequests(statusFilter)
      .then((data) => {
        if (!isActive) return;
        setRefundRequests(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [statusFilter]);

  const handleStatusChange = useCallback((nextStatus) => {
    setLoading(true);
    setError(null);

    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', nextStatus);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const pendingCount = useMemo(() => {
    return refundRequests.filter(r => r.status === 'pending' || r.status === 'manual_review_required').length;
  }, [refundRequests]);

  if (loading) return <LoadingSpinner message="Loading refund requests..." />;
  if (error) return <ErrorMessage error={error} onRetry={handleRetry} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h2>Refund Requests</h2>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {refundRequests.length} requests · {pendingCount} pending review
        </span>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="form-select"
          style={{ width: '240px' }}
          aria-label="Filter refund requests by status"
        >
          {REFUND_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      {refundRequests.length === 0 ? (
        <EmptyState
          title="No Refund Requests"
          description="No refund requests match your current status filter."
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Order ID</th>
                  <th>Customer ID</th>
                  <th>Status</th>
                  <th>Abuse Score Snapshot</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundRequests.map((request) => (
                  <tr key={request.id}>
                    <td style={{ fontWeight: 'var(--font-weight-bold)' }}>#{request.id}</td>
                    <td>
                      {request.orderId ? (
                        <Link to={`/orders/${request.orderId}`} className="link">
                          Order #{request.orderId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{request.customerId || '—'}</td>
                    <td><StatusBadge value={request.status} /></td>
                    <td>{request.abuseScoreSnapshot ?? '—'}</td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {request.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <Link to={`/refund-requests/${request.id}`} className="link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeFilterValue(value, allowedValues) {
  if (!value) {
    return 'ALL';
  }

  const normalized = value.trim().toLowerCase();
  return allowedValues.includes(normalized) ? normalized : 'ALL';
}
