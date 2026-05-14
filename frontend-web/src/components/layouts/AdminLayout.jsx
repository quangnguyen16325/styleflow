import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(255, 248, 241, 0.72) 0%, var(--color-bg) 240px)",
      }}
    >
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} isMobile={isMobile} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Header onToggleSidebar={handleToggleSidebar} isMobile={isMobile} />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              padding: isMobile ? "18px" : "28px 32px",
              maxWidth: "1480px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <Outlet />
          </div>
        </main>
        <footer
          style={{
            padding: "11px var(--spacing-xl)",
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "rgba(255, 255, 255, 0.86)",
            backdropFilter: "blur(10px)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          © 2026 StyleFlow • v0.5.0
        </footer>
      </div>
    </div>
  );
}
