import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Search } from "lucide-react";
import {
  clearAdminSession,
  getPortalRoleConfig,
  getStoredAdminUser,
  normalizeRole,
} from "../../utils/auth";

export default function Header({ onToggleSidebar, isMobile }) {
  const navigate = useNavigate();
  const user = getStoredAdminUser();
  const role = normalizeRole(user?.role);
  const roleConfig = getPortalRoleConfig(role);
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogout = () => {
    clearAdminSession();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    const targetPath = role === "shipper" ? "/shipper" : "/orders";
    navigate(`${targetPath}?q=${encodeURIComponent(term)}`);
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <header
      style={{
        height: "60px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 var(--spacing-md)" : "0 var(--spacing-xl)",
        flexShrink: 0,
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              color: "var(--color-text)",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "#fff",
            }}
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div>
          <h1
            style={{
              fontSize: isMobile ? "var(--font-size-sm)" : "var(--font-size-md)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-dark)",
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            {roleConfig.headerTitle}
          </h1>
          {!isMobile && (
            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: "11px",
                fontWeight: "var(--font-weight-medium)",
                marginTop: "1px",
              }}
            >
              {roleConfig.headerSubtitle}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "var(--spacing-sm)" : "var(--spacing-md)",
        }}
      >
        {!isMobile && (
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "280px",
              height: "36px",
              padding: "0 11px",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "#fff",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <Search size={15} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={roleConfig.searchPlaceholder}
              aria-label={roleConfig.searchPlaceholder}
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                padding: 0,
                background: "transparent",
                color: "var(--color-text)",
                font: "inherit",
              }}
            />
          </form>
        )}
        {user ? (
          <>
            {!isMobile && (
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-dark)",
                    lineHeight: 1.3,
                  }}
                >
                  {user.fullName}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {user.role}
                </div>
              </div>
            )}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary-light)",
                color: "var(--color-primary-active)",
                border: "1px solid #ffd2a8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "var(--font-weight-semibold)",
                fontSize: "var(--font-size-xs)",
              }}
              title={isMobile ? user.fullName : ""}
            >
              {initials}
            </div>
            <button onClick={handleLogout} className="btn-secondary btn-sm" aria-label="Log out">
              {isMobile ? <LogOut size={14} /> : "Log out"}
            </button>
          </>
        ) : (
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--color-text-secondary)",
            }}
          >
            Guest
          </div>
        )}
      </div>
    </header>
  );
}
