import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ApiService from '../../api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

const ISSUE_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
];

const ISSUE_SEVERITIES = [
  { value: 'ALL', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const ISSUE_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'MANUAL_REVIEW', label: 'Manual Review' },
  { value: 'PAYMENT_ERROR', label: 'Payment Error' },
  { value: 'ORDER_FAILED', label: 'Order Failed' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
];

const ISSUE_STATUS_VALUES = ISSUE_STATUSES.map((item) => item.value);
const ISSUE_SEVERITY_VALUES = ISSUE_SEVERITIES.map((item) => item.value);
const ISSUE_TYPE_VALUES = ISSUE_TYPES.map((item) => item.value);

export default function IssueList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = normalizeFilterValue(searchParams.get('status'), ISSUE_STATUS_VALUES);
  const severityFilter = normalizeFilterValue(searchParams.get('severity'), ISSUE_SEVERITY_VALUES);
  const typeFilter = normalizeFilterValue(searchParams.get('type'), ISSUE_TYPE_VALUES);

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleFilterChange = (key, value) => {
    setLoading(true);
    setError(null);

    const nextParams = new URLSearchParams(searchParams);
    if (value === 'ALL') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let isActive = true;

    ApiService.getIssues({
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      type: typeFilter !== 'ALL' ? typeFilter : undefined,
    })
      .then((data) => {
        if (!isActive) return;
        setIssues(Array.isArray(data) ? data : []);
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
  }, [statusFilter, severityFilter, typeFilter]);

  if (loading) return <LoadingSpinner message="Loading issues..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ margin: 0, color: 'var(--color-dark)', fontSize: 'var(--font-size-2xl)' }}>Issues</h2>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{issues.length} issues</span>
      </div>

      {/* Filter Toolbar */}
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="form-select"
          style={{ width: '180px' }}
        >
          {ISSUE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          className="form-select"
          style={{ width: '180px' }}
        >
          {ISSUE_SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="form-select"
          style={{ width: '200px' }}
        >
          {ISSUE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {issues.length === 0 ? (
        <EmptyState title="No Issues Found" description="No issues match your current filter criteria." />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Order ID</th>
                <th>Product ID</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td style={{ fontWeight: 'var(--font-weight-bold)' }}>#{issue.id}</td>
                  <td><StatusBadge value={issue.type} /></td>
                  <td><StatusBadge value={issue.severity} /></td>
                  <td><StatusBadge value={issue.status} /></td>
                  <td>
                    {issue.orderId ? (
                      <Link to={`/orders/${issue.orderId}`} className="link">
                        Order #{issue.orderId}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    {issue.productId ? (
                      <Link to={`/products/${issue.productId}`} className="link">
                        Product #{issue.productId}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    {new Date(issue.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <Link to={`/issues/${issue.id}`} className="link">
                      View
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
  const matchedValue = allowedValues.find((allowed) => allowed.toLowerCase() === normalized);
  return matchedValue || 'ALL';
}
