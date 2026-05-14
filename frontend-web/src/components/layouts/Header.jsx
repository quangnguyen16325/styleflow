import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Search } from "lucide-react";
import {
  clearAdminSession,
  getPortalRoleConfig,
  getStoredAdminUser,
  normalizeRole,
} from "../../utils/auth";

const ADMIN_FUNCTIONS = [
  {
    label: "Dashboard",
    description: "Overview, metrics, recent operations",
    path: "/",
    keywords: ["home", "overview", "metrics", "dashboard", "thong ke", "tong quan"],
  },
  {
    label: "Orders",
    description: "Order list, payment and delivery status",
    path: "/orders",
    keywords: ["order", "orders", "don hang", "payment", "delivery", "giao hang"],
  },
  {
    label: "Users",
    description: "Manage customers, shippers, staff and admin accounts",
    path: "/users",
    keywords: ["users", "user", "customers", "staff", "shipper", "nguoi dung", "khach hang"],
  },
  {
    label: "Delivery Assignment",
    description: "Assign orders to shipper accounts",
    path: "/delivery",
    keywords: ["delivery", "shipper", "assign", "phan bo", "giao don"],
  },
  {
    label: "Inventory",
    description: "Products, stock, pricing and images",
    path: "/products",
    keywords: ["products", "product", "inventory", "stock", "san pham", "ton kho"],
  },
  {
    label: "Create Product",
    description: "Add a new product",
    path: "/products/new",
    keywords: ["new product", "create product", "them san pham"],
  },
  {
    label: "Categories",
    description: "Product categories",
    path: "/categories",
    keywords: ["category", "categories", "danh muc"],
  },
  {
    label: "Create Category",
    description: "Add a new product category",
    path: "/categories/new",
    keywords: ["new category", "create category", "them danh muc"],
  },
  {
    label: "Issues",
    description: "Payment, delivery and abuse cases",
    path: "/issues",
    keywords: ["issue", "issues", "error", "loi", "su co"],
  },
  {
    label: "Refund Requests",
    description: "Review and approve return requests",
    path: "/refund-requests",
    keywords: ["refund", "return", "returns", "tra hang", "hoan hang"],
  },
];

const SHIPPER_FUNCTIONS = [
  {
    label: "My Deliveries",
    description: "Assigned deliveries and status updates",
    path: "/shipper",
    keywords: ["delivery", "deliveries", "shipper", "giao hang"],
  },
];

export default function Header({ onToggleSidebar, isMobile }) {
  const navigate = useNavigate();
  const user = getStoredAdminUser();
  const role = normalizeRole(user?.role);
  const roleConfig = getPortalRoleConfig(role);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const functionItems = role === "shipper" ? SHIPPER_FUNCTIONS : ADMIN_FUNCTIONS;
  const visibleFunctionItems = useMemo(() => {
    const term = normalizeSearchText(searchTerm);
    if (!term) {
      return functionItems;
    }

    return functionItems.filter((item) => {
      const searchableText = normalizeSearchText(
        [item.label, item.description, item.path, ...(item.keywords || [])].join(" "),
      );
      return searchableText.includes(term);
    });
  }, [functionItems, searchTerm]);

  const handleLogout = () => {
    clearAdminSession();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const firstMatch = visibleFunctionItems[0];
    if (!firstMatch) return;

    navigateToFunction(firstMatch.path);
  };

  const navigateToFunction = (path) => {
    navigate(path);
    setSearchTerm("");
    setIsSearchOpen(false);
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
        position: "relative",
        zIndex: "var(--z-popover)",
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
              position: "relative",
              zIndex: "var(--z-tooltip)",
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
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={roleConfig.searchPlaceholder}
              aria-label={roleConfig.searchPlaceholder}
              autoComplete="off"
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
            {isSearchOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "44px",
                  left: 0,
                  right: 0,
                  zIndex: "var(--z-tooltip)",
                  padding: "6px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "#fff",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {visibleFunctionItems.length === 0 ? (
                  <div
                    style={{
                      padding: "10px",
                      color: "var(--color-text-muted)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    No functions found
                  </div>
                ) : (
                  visibleFunctionItems.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => navigateToFunction(item.path)}
                      style={{
                        width: "100%",
                        display: "block",
                        padding: "9px 10px",
                        border: 0,
                        borderRadius: "var(--radius-md)",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "var(--color-dark)",
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: "2px",
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                          lineHeight: 1.35,
                        }}
                      >
                        {item.description}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
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

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase();
}
