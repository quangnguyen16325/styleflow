import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import StatusBadge from '../../components/ui/StatusBadge';

const ISSUE_STATUSES = ['open', 'investigating', 'resolved', 'ignored'];

export default function IssueDetails() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    ApiService.getIssue(id)
      .then((data) => {
        setIssue(data);
        setNewStatus(data.status);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = useCallback(async () => {
    if (newStatus === issue.status) return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    try {
      const updated = await ApiService.updateIssueStatus(id, newStatus);
      setIssue(updated);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err);
    } finally {
      setUpdating(false);
    }
  }, [id, newStatus, issue]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  if (loading) return <LoadingSpinner message="Loading issue details..." />;
  if (error) return <ErrorMessage error={error} onRetry={handleRetry} />;
  if (!issue) return null;

  const logHistory = Array.isArray(issue.logHistory) ? issue.logHistory : [];

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link to="/issues" className="link">&larr; Back to Issues</Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <h2>Issue #{issue.id}</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <StatusBadge value={issue.type} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 14px' }} />
          <StatusBadge value={issue.severity} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 14px' }} />
          <StatusBadge value={issue.status} style={{ fontSize: 'var(--font-size-sm)', padding: '5px 14px' }} />
        </div>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-sm)' }}>
        Created on <strong>{new Date(issue.createdAt).toLocaleString()}</strong>
        {issue.updatedAt && issue.updatedAt !== issue.createdAt && (
          <> &middot; Updated <strong>{new Date(issue.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      {/* Status Update Action */}
      <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)', color: 'var(--color-dark)' }}>Update Issue Status</h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select"
            style={{ width: '200px' }}
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleUpdateStatus}
            disabled={updating || newStatus === issue.status}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
          {newStatus === issue.status && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Current status selected</span>
          )}
        </div>
        {updateError && <div style={{ marginTop: 'var(--spacing-sm)' }}><ErrorMessage error={updateError} /></div>}
        {updateSuccess && (
          <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
            Issue status updated successfully
          </div>
        )}
      </div>

      {/* Issue Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        {/* Issue Info */}
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Issue Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
            <div><strong>Type:</strong> <StatusBadge value={issue.type} /></div>
            <div><strong>Severity:</strong> <StatusBadge value={issue.severity} /></div>
            <div><strong>Status:</strong> <StatusBadge value={issue.status} /></div>
          </div>
        </div>

        {/* Linked Resources */}
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>Linked Resources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
            <div>
              <strong>Order:</strong>{' '}
              {issue.orderId ? (
                <Link to={`/orders/${issue.orderId}`} className="link">
                  Order #{issue.orderId} →
                </Link>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>None</span>
              )}
            </div>
            <div>
              <strong>Product:</strong>{' '}
              {issue.productId ? (
                <Link to={`/products/${issue.productId}`} className="link">
                  Product #{issue.productId} →
                </Link>
              ) : (
                <span style={{ color: 'var(--color-text-muted)' }}>None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log History Timeline */}
      <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-lg) 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
          Log History
          <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-xs)' }}>
            ({logHistory.length} {logHistory.length === 1 ? 'entry' : 'entries'})
          </span>
        </h3>

        {logHistory.length === 0 ? (
          <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
            No log entries yet
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 'var(--spacing-xl)' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '7px',
              top: '4px',
              bottom: '4px',
              width: '2px',
              backgroundColor: 'var(--color-border)',
            }} />

            {logHistory.map((entry, index) => (
              <div key={index} style={{ position: 'relative', marginBottom: 'var(--spacing-lg)', paddingBottom: index < logHistory.length - 1 ? '0' : '0' }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '6px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: index === 0 ? 'var(--color-primary)' : '#bdbdbd',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 2px ' + (index === 0 ? 'var(--color-primary)' : 'var(--color-border)'),
                }} />

                <div style={{
                  padding: 'var(--spacing-sm) var(--spacing-lg)',
                  background: index === 0 ? '#e8f0fe' : 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid ' + (index === 0 ? '#c2d9f7' : 'var(--color-border)'),
                }}>
                  {typeof entry === 'object' ? (
                    <>
                      {entry.message && <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>{entry.message}</div>}
                      {entry.timestamp && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      )}
                      {entry.status && (
                        <div style={{ marginTop: 'var(--spacing-xs)' }}>
                          <StatusBadge value={entry.status} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>{String(entry)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
