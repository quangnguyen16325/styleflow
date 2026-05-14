import { useEffect, useMemo, useState } from "react";
import ApiService from "../../api";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import ErrorMessage from "../../components/ui/ErrorMessage";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StatusBadge from "../../components/ui/StatusBadge";
import { getStoredAdminUser, normalizeRole } from "../../utils/auth";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "shipper", label: "Shipper" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  email: "",
  role: "customer",
  password: "",
  abuseScore: 0,
  isBlacklisted: false,
};

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
  { value: "ALL", label: "All rows" },
];

export default function UserManagement() {
  const currentUser = getStoredAdminUser();
  const currentRole = normalizeRole(currentUser?.role);
  const allowedRoles = currentRole === "admin" ? ROLE_OPTIONS : ROLE_OPTIONS.slice(0, 2);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [formMode, setFormMode] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = normalizeSearchText(searchTerm);
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesSearch =
        !term ||
        [user.id, user.fullName, user.phone, user.email, user.role]
          .map((value) => normalizeSearchText(value))
          .some((value) => value.includes(term));
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  const pagination = useMemo(() => {
    if (pageSize === "ALL") {
      return {
        page: 1,
        totalPages: 1,
        startIndex: filteredUsers.length > 0 ? 1 : 0,
        endIndex: filteredUsers.length,
        rows: filteredUsers,
      };
    }

    const numericPageSize = Number(pageSize);
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / numericPageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startOffset = (safePage - 1) * numericPageSize;

    return {
      page: safePage,
      totalPages,
      startIndex: filteredUsers.length > 0 ? startOffset + 1 : 0,
      endIndex: Math.min(startOffset + numericPageSize, filteredUsers.length),
      rows: filteredUsers.slice(startOffset, startOffset + numericPageSize),
    };
  }, [filteredUsers, pageSize, currentPage]);

  const updateSearchTerm = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const updateRoleFilter = (value) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const updatePageSize = (value) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const openCreateForm = () => {
    setFormMode("create");
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, role: allowedRoles[0]?.value || "customer" });
    setError(null);
  };

  const openEditForm = (user) => {
    setFormMode("edit");
    setEditingUser(user);
    setForm({
      fullName: user.fullName || "",
      phone: user.phone || "",
      email: user.email || "",
      role: user.role || "customer",
      password: "",
      abuseScore: Number(user.abuseScore || 0),
      isBlacklisted: Boolean(user.isBlacklisted),
    });
    setError(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  const handleFormChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        role: form.role,
        abuseScore: Number(form.abuseScore || 0),
        isBlacklisted: Boolean(form.isBlacklisted),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (formMode === "create") {
        payload.password = form.password;
        const created = await ApiService.createUser(payload);
        setUsers((current) => [created, ...current]);
      } else {
        const updated = await ApiService.updateUser(editingUser.id, payload);
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      }

      closeForm();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      setError(null);
      await ApiService.deleteUser(deleteTarget.id);
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err);
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">
            {currentRole === "admin"
              ? "Manage customers, shippers, staff and admin accounts."
              : "Manage customer and shipper accounts."}
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary" onClick={openCreateForm}>
            Create User
          </button>
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            {users.length} total
          </span>
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <ErrorMessage error={error} onRetry={loadUsers} onDismiss={() => setError(null)} />
        </div>
      ) : null}

      <div className="grid grid-4" style={{ marginBottom: "var(--spacing-lg)" }}>
        {allowedRoles.map((role) => (
          <div key={role.value} className="card" style={{ padding: "var(--spacing-lg)" }}>
            <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              {role.label}
            </div>
            <div
              style={{
                marginTop: "var(--spacing-xs)",
                color: "var(--color-dark)",
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              {roleCounts[role.value] || 0}
            </div>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--spacing-sm)",
          padding: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <input
          className="form-input"
          type="search"
          value={searchTerm}
          onChange={(event) => updateSearchTerm(event.target.value)}
          placeholder="Search by name, phone, email or role..."
          aria-label="Search users"
        />
        <select
          className="form-select"
          value={roleFilter}
          onChange={(event) => updateRoleFilter(event.target.value)}
          aria-label="Filter users by role"
        >
          <option value="ALL">All Roles</option>
          {allowedRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={pageSize}
          onChange={(event) => updatePageSize(event.target.value)}
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {users.length === 0 ? (
        <EmptyState
          title="No Users"
          description="No users are available for your permission scope."
          action={openCreateForm}
          actionLabel="Create User"
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="No Matches" description="No users match your current filters." />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Abuse</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.rows.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: "var(--font-weight-semibold)" }}>#{user.id}</td>
                    <td>
                      <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                        {user.fullName}
                      </div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                        {user.email}
                      </div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                        {user.phone}
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={user.role} size="sm" />
                    </td>
                    <td>
                      <StatusBadge
                        value={user.isBlacklisted ? "blacklisted" : "active"}
                        size="sm"
                        showIcon
                      />
                    </td>
                    <td>{user.abuseScore}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => openEditForm(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => setDeleteTarget(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--spacing-md)",
              padding: "var(--spacing-md)",
              borderTop: "1px solid var(--color-border)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              Showing {pagination.startIndex}-{pagination.endIndex} of {filteredUsers.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {formMode ? (
        <UserFormModal
          mode={formMode}
          form={form}
          allowedRoles={allowedRoles}
          saving={saving}
          onChange={handleFormChange}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete User"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.fullName}? This only works when the user has no related orders, deliveries or refund requests.`
            : ""
        }
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function UserFormModal({ mode, form, allowedRoles, saving, onChange, onClose, onSubmit }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--spacing-lg)",
        background: "var(--color-overlay)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        className="card"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          padding: "var(--spacing-xl)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "var(--color-dark)" }}>
          {mode === "create" ? "Create User" : "Edit User"}
        </h3>
        <div className="grid grid-2" style={{ gap: "var(--spacing-md)" }}>
          <Field label="Full name">
            <input
              className="form-input"
              value={form.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              className="form-input"
              value={form.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              required
            />
          </Field>
          <Field label="Role">
            <select
              className="form-select"
              value={form.role}
              onChange={(event) => onChange("role", event.target.value)}
              required
            >
              {allowedRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={mode === "create" ? "Password" : "New password"}>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              required={mode === "create"}
              minLength={8}
              placeholder={mode === "edit" ? "Leave blank to keep current password" : ""}
            />
          </Field>
          <Field label="Abuse score">
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.abuseScore}
              onChange={(event) => onChange("abuseScore", event.target.value)}
            />
          </Field>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            marginTop: "var(--spacing-md)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <input
            type="checkbox"
            checked={form.isBlacklisted}
            onChange={(event) => onChange("isBlacklisted", event.target.checked)}
          />
          Blacklist this user
        </label>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--spacing-sm)",
            marginTop: "var(--spacing-xl)",
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save User"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: "var(--spacing-xs)",
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
