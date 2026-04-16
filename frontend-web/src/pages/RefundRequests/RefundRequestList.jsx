import { useEffect, useState } from 'react';
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

  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(statusFromQuery);

  useEffect(() => {
    if (statusFromQuery !== statusFilter) {
      setStatusFilter(statusFromQuery);
      setLoading(true);
      setError(null);
    }
  }, [statusFromQuery, statusFilter]);

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

  const handleStatusChange = (nextStatus) => {
    setLoading(true);
    setError(null);
    setStatusFilter(nextStatus);

    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', nextStatus);
    }
    setSearchParams(nextParams, { replace: true });
  };

  if (loading) return <LoadingSpinner message="Loading refund requests..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Refund Requests</h2>
        <span style={{ fontSize: '13px', color: '#5f6368' }}>{refundRequests.length} request(s)</span>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="form-select"
          style={{ width: '240px' }}
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
          <table>
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
                  <td style={{ fontWeight: 'bold' }}>#{request.id}</td>
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
                  <td style={{ fontSize: '13px', color: '#5f6368' }}>
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>
                    <Link to={`/refund-requests/${request.id}`} className="link">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
