const ADMIN_ROLES = new Set(['admin', 'staff']);
const PORTAL_ROLES = new Set(['admin', 'staff', 'shipper']);
const TOKEN_STORAGE_KEY = 'admin_token';
const USER_STORAGE_KEY = 'admin_user';

/**
 * Check if a role is privileged (admin or staff)
 */
export function isPrivilegedRole(role) {
  if (typeof role !== 'string') {
    return false;
  }
  return ADMIN_ROLES.has(role.trim().toLowerCase());
}

export function isPortalRole(role) {
  return PORTAL_ROLES.has(normalizeRole(role));
}

export function normalizeRole(role) {
  if (typeof role !== 'string') {
    return '';
  }
  return role.trim().toLowerCase();
}

export function getPortalRoleConfig(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'shipper') {
    return {
      role: 'shipper',
      title: 'Shipper Portal',
      sidebarSubtitle: 'Delivery workspace',
      headerTitle: 'Shipper Portal',
      headerSubtitle: 'Assigned deliveries and status updates',
      searchPlaceholder: 'Search deliveries',
      footerTitle: 'Delivery',
      footerVersion: 'Shipper workspace',
    };
  }

  if (normalizedRole === 'staff') {
    return {
      role: 'staff',
      title: 'Staff Console',
      sidebarSubtitle: 'Operations workspace',
      headerTitle: 'Staff Portal',
      headerSubtitle: 'Orders, delivery and support operations',
      searchPlaceholder: 'Search operations',
      footerTitle: 'Staff operations',
      footerVersion: 'Operations workspace',
    };
  }

  return {
    role: 'admin',
    title: 'Admin Console',
    sidebarSubtitle: 'Admin console',
    headerTitle: 'Admin Portal',
    headerSubtitle: 'Inventory, orders and operations',
    searchPlaceholder: 'Search console',
    footerTitle: 'Operations',
    footerVersion: 'v0.5.0',
  };
}

/**
 * Get stored admin token from localStorage
 */
export function getStoredAdminToken() {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (typeof token !== 'string') {
      return null;
    }
    const normalized = token.trim();
    return normalized || null;
  } catch (error) {
    console.error('Error reading token from localStorage:', error);
    return null;
  }
}

/**
 * Get stored admin user from localStorage
 */
export function getStoredAdminUser() {
  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) {
      return null;
    }
    const parsed = JSON.parse(rawUser);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Error reading user from localStorage:', error);
    return null;
  }
}

/**
 * Store admin session (token and user)
 */
export function storeAdminSession(token, user) {
  try {
    if (!token || !user) {
      throw new Error('Token and user are required');
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error storing admin session:', error);
    return false;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token) {
  if (!token) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return false;
  }

  try {
    const payload = decodeBase64Url(parts[1]);
    const parsedPayload = JSON.parse(payload);
    if (typeof parsedPayload.exp !== 'number') {
      return false;
    }
    return Date.now() >= parsedPayload.exp * 1000;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return false;
  }
}

/**
 * Check if user has a valid admin session
 */
export function hasValidAdminSession() {
  const token = getStoredAdminToken();
  const user = getStoredAdminUser();

  if (!token || !user || !isPortalRole(user.role)) {
    return false;
  }

  return !isTokenExpired(token);
}

/**
 * Clear admin session from localStorage
 */
export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing admin session:', error);
  }
}

/**
 * Decode base64url string (JWT payload)
 */
function decodeBase64Url(value) {
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');

  const padding = normalized.length % 4;
  if (padding === 2) {
    normalized += '==';
  } else if (padding === 3) {
    normalized += '=';
  } else if (padding !== 0) {
    throw new Error('Invalid base64url payload');
  }

  return atob(normalized);
}
