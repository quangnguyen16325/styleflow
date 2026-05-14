import { NavLink } from "react-router-dom";
import { useEffect } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { getPortalRoleConfig, getStoredAdminUser, normalizeRole } from "../../utils/auth";

const adminMenuItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Inventory", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/users", label: "Users", icon: Users },
  { to: "/delivery", label: "Delivery", icon: Truck },
  { to: "/issues", label: "Issues", icon: AlertTriangle },
  { to: "/refund-requests", label: "Refunds", icon: Receipt },
];

const staffMenuItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/users", label: "Users", icon: Users },
  { to: "/delivery", label: "Delivery", icon: Truck },
  { to: "/issues", label: "Issues", icon: AlertTriangle },
  { to: "/refund-requests", label: "Refunds", icon: Receipt },
  { to: "/products", label: "Inventory", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
];

const shipperMenuItems = [{ to: "/shipper", label: "My Deliveries", icon: Truck, end: true }];

export default function Sidebar({ collapsed = false, onToggle, isMobile = false }) {
  const user = getStoredAdminUser();
  const role = normalizeRole(user?.role);
  const roleConfig = getPortalRoleConfig(role);
  const visibleMenuItems =
    role === "shipper" ? shipperMenuItems : role === "staff" ? staffMenuItems : adminMenuItems;
  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (!isMobile || collapsed) return;

    const handleClickOutside = (e) => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && !sidebar.contains(e.target)) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, collapsed, onToggle]);

  const linkStyle = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: collapsed ? "10px" : "9px 12px",
    color: isActive ? "#111827" : "#5f6b7a",
    backgroundColor: isActive ? "#fff4e8" : "transparent",
    border: isActive ? "1px solid #ffd2a8" : "1px solid transparent",
    textDecoration: "none",
    fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
    fontSize: "var(--font-size-sm)",
    borderRadius: "var(--radius-md)",
    marginBottom: "4px",
    transition: "all var(--transition-fast)",
    justifyContent: collapsed ? "center" : "flex-start",
  });

  const hoverStyle = (e) => {
    if (!e.currentTarget.classList.contains("active")) {
      e.currentTarget.style.backgroundColor = "#f8fafc";
      e.currentTarget.style.color = "var(--color-text)";
      e.currentTarget.style.borderColor = "var(--color-border-light)";
    }
  };

  const leaveStyle = (e) => {
    if (!e.currentTarget.classList.contains("active")) {
      e.currentTarget.style.backgroundColor = "transparent";
      e.currentTarget.style.color = "#5f6b7a";
      e.currentTarget.style.borderColor = "transparent";
    }
  };

  const handleNavClick = () => {
    if (isMobile && !collapsed) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--color-overlay)",
            zIndex: "var(--z-modal-backdrop)",
          }}
          onClick={onToggle}
        />
      )}

      <aside
        id="sidebar"
        style={{
          width: collapsed ? (isMobile ? "0" : "72px") : "248px",
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width var(--transition-normal)",
          position: isMobile ? "fixed" : "relative",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: isMobile ? "var(--z-modal)" : "auto",
          overflow: "hidden",
          boxShadow: isMobile && !collapsed ? "var(--shadow-md)" : "none",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            padding: collapsed ? "18px 12px" : "18px 16px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: "var(--spacing-sm)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, #f6821f 0%, #f45d01 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "var(--font-weight-bold)",
                color: "#fff",
                boxShadow: "0 8px 18px rgba(246, 130, 31, 0.28)",
              }}
            >
              EC
            </div>
            {!collapsed && (
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-dark)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Ecloria
                </div>
                <div
                  style={{
                    marginTop: "1px",
                    color: "var(--color-text-muted)",
                    fontSize: "11px",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  {roleConfig.sidebarSubtitle}
                </div>
              </div>
            )}
          </div>
          {!collapsed && !isMobile && (
            <button
              onClick={onToggle}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "var(--spacing-xs)",
                transition: "color var(--transition-fast)",
                display: "inline-flex",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--color-text)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--color-text-muted)")}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && !isMobile && (
          <button
            onClick={onToggle}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: "8px",
              margin: "var(--spacing-sm)",
              borderRadius: "var(--radius-sm)",
              transition: "all var(--transition-fast)",
              display: "inline-flex",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "var(--color-bg)";
              e.target.style.color = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "var(--color-text-muted)";
            }}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <nav
          style={{
            flex: 1,
            padding: collapsed ? "14px 8px" : "14px 12px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={linkStyle}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : "")}
              onMouseEnter={hoverStyle}
              onMouseLeave={leaveStyle}
              onClick={handleNavClick}
              title={collapsed ? item.label : ""}
              aria-label={item.label}
            >
              <span style={{ display: "flex", alignItems: "center", color: "inherit" }}>
                <item.icon size={18} strokeWidth={2} />
              </span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div
            style={{
              padding: "var(--spacing-md)",
              borderTop: "1px solid var(--color-border)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            <div style={{ color: "var(--color-text)", fontWeight: "var(--font-weight-semibold)" }}>
              {roleConfig.footerTitle}
            </div>
            <div style={{ marginTop: 2 }}>{roleConfig.footerVersion}</div>
          </div>
        )}
      </aside>
    </>
  );
}
