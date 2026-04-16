const ADMIN_ROLES = new Set(['admin', 'staff']);

export function isPrivilegedRole(role) {
  if (typeof role !== 'string') {
    return false;
  }

  return ADMIN_ROLES.has(role.trim().toLowerCase());
}

export function getStoredAdminToken() {
  const token = localStorage.getItem('admin_token');
  if (typeof token !== 'string') {
    return null;
  }

  const normalized = token.trim();
  return normalized ? normalized : null;
}

export function getStoredAdminUser() {
  const rawUser = localStorage.getItem('admin_user');
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

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
  } catch {
    return false;
  }
}

export function hasValidAdminSession() {
  const token = getStoredAdminToken();
  const user = getStoredAdminUser();

  if (!token || !user || !isPrivilegedRole(user.role)) {
    return false;
  }

  return !isTokenExpired(token);
}

export function clearAdminSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}

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
