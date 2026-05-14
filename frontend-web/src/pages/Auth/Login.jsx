import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ApiService from "../../api";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { clearAdminSession, isPrivilegedRole, storeAdminSession } from "../../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const expired = location.state?.expired;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await ApiService.login(email, password);

      if (!response?.token || !response?.customer) {
        throw new Error("Invalid response from server");
      }

      if (!isPrivilegedRole(response.customer.role)) {
        clearAdminSession();
        setError({
          code: "FORBIDDEN",
          message: "Only admin/staff accounts can access the admin portal.",
        });
        return;
      }

      storeAdminSession(response.token, response.customer);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(246, 130, 31, 0.16), transparent 30rem), linear-gradient(135deg, #fffaf4 0%, #f7f8fa 42%, #eef1f5 100%)",
        padding: "var(--spacing-xl)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          animation: "fadeIn 0.3s ease-in-out",
        }}
      >
        <div
          style={{
            marginBottom: "var(--spacing-xl)",
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-md)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              background: "linear-gradient(135deg, #f6821f 0%, #f45d01 100%)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "var(--font-weight-bold)",
              color: "#fff",
              boxShadow: "0 12px 26px rgba(246, 130, 31, 0.3)",
            }}
          >
            EC
          </div>
          <div>
            <h1
              style={{
                margin: "0 0 var(--spacing-xs) 0",
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-dark)",
                letterSpacing: "-0.04em",
              }}
            >
              Ecloria Console
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              Admin and staff operations
            </p>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "28px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {expired && (
            <div
              style={{
                padding: "var(--spacing-md)",
                marginBottom: "var(--spacing-md)",
                background: "var(--color-warning-light)",
                border: "1px solid var(--color-warning)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text)",
              }}
              role="alert"
            >
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ecloria.co.uk"
                autoComplete="email"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="form-input"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "var(--spacing-lg)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          Ecloria Admin • Internal Use Only
        </div>
      </div>
    </div>
  );
}
