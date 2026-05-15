import { Navigate, Outlet } from "react-router-dom";
import { getStoredAdminUser } from "../../utils/auth";

export default function RoleRoute({ allowedRoles, redirectTo = "/" }) {
  const user = getStoredAdminUser();
  const role = String(user?.role || "").toLowerCase();

  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
