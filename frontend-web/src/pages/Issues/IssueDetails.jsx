import { useEffect, useState } from 'react';
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

  const handleUpdateStatus = async () => {
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
  };

  if (loading) return <LoadingSpinner message="Loading issue details..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!issue) return null;

  const logHistory = Array.isArray(issue.logHistory) ? issue.logHistory : [];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/issues" className="link">&larr; Back to Issues</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, color: '#202124' }}>Issue #{issue.id}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatusBadge value={issue.type} style={{ fontSize: '13px', padding: '5px 14px' }} />
          <StatusBadge value={issue.severity} style={{ fontSize: '13px', padding: '5px 14px' }} />
          <StatusBadge value={issue.status} style={{ fontSize: '13px', padding: '5px 14px' }} />
        </div>
      </div>
      <p style={{ color: '#5f6368', marginBottom: '24px', fontSize: '14px' }}>
        Created on <strong>{new Date(issue.createdAt).toLocaleString()}</strong>
        {issue.updatedAt && issue.updatedAt !== issue.createdAt && (
          <> &middot; Updated <strong>{new Date(issue.updatedAt).toLocaleString()}</strong></>
        )}
      </p>

      {/* Status Update Action */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#202124' }}>Update Issue Status</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '13px', color: '#5f6368' }}>Current status selected</span>
          )}
        </div>
        {updateError && <div style={{ marginTop: '10px' }}><ErrorMessage error={updateError} /></div>}
        {updateSuccess && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', fontSize: '14px' }}>
            ✓ Issue status updated successfully
          </div>
        )}
      </div>

      {/* Issue Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Issue Info */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>Issue Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div><strong>Type:</strong> <StatusBadge value={issue.type} /></div>
            <div><strong>Severity:</strong> <StatusBadge value={issue.severity} /></div>
            <div><strong>Status:</strong> <StatusBadge value={issue.status} /></div>
          </div>
        </div>

        {/* Linked Resources */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>Linked Resources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong>Order:</strong>{' '}
              {issue.orderId ? (
                <Link to={`/orders/${issue.orderId}`} className="link">
                  Order #{issue.orderId} →
                </Link>
              ) : (
                <span style={{ color: '#999' }}>None</span>
              )}
            </div>
            <div>
              <strong>Product:</strong>{' '}
              {issue.productId ? (
                <Link to={`/products/${issue.productId}`} className="link">
                  Product #{issue.productId} →
                </Link>
              ) : (
                <span style={{ color: '#999' }}>None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log History Timeline */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px', fontSize: '15px' }}>
          Log History
          <span style={{ fontWeight: 'normal', color: '#5f6368', fontSize: '13px', marginLeft: '8px' }}>
            ({logHistory.length} {logHistory.length === 1 ? 'entry' : 'entries'})
          </span>
        </h3>

        {logHistory.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', background: '#f9f9f9', borderRadius: '6px', border: '1px dashed #ddd' }}>
            No log entries yet
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '7px',
              top: '4px',
              bottom: '4px',
              width: '2px',
              backgroundColor: '#e0e0e0',
            }} />

            {logHistory.map((entry, index) => (
              <div key={index} style={{ position: 'relative', marginBottom: '20px', paddingBottom: index < logHistory.length - 1 ? '0' : '0' }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '6px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: index === 0 ? '#1a73e8' : '#bdbdbd',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 2px ' + (index === 0 ? '#1a73e8' : '#e0e0e0'),
                }} />

                <div style={{
                  padding: '12px 16px',
                  background: index === 0 ? '#e8f0fe' : '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid ' + (index === 0 ? '#c2d9f7' : '#e0e0e0'),
                }}>
                  {typeof entry === 'object' ? (
                    <>
                      {entry.message && <div style={{ fontSize: '14px', marginBottom: '4px' }}>{entry.message}</div>}
                      {entry.timestamp && (
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      )}
                      {entry.status && (
                        <div style={{ marginTop: '6px' }}>
                          <StatusBadge value={entry.status} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '14px' }}>{String(entry)}</div>
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
