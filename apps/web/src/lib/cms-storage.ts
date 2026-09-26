const branchKey = 'restaurent:cms:branchId';
const refreshTokenKey = 'restaurent:cms:refreshToken';
const roleKey = 'restaurent:cms:role';
const tokenKey = 'restaurent:cms:accessToken';
const tenantKey = 'restaurent:cms:tenantId';
const userKey = 'restaurent:cms:userId';
// Cached for first-paint nav only. Never trusted for authorization — the API's
// PermissionsGuard decides that, and this value is user-editable.
const permissionsKey = 'restaurent:cms:permissions';

// These run during prerender too (the CMS session provider seeds its state
// synchronously so the sidebar is right on first paint), so every accessor has
// to tolerate there being no window.
const hasStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

export function readCmsSettings(): {
  branchId: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  token: string;
  userId: string;
} {
  if (!hasStorage()) {
    return { branchId: '', refreshToken: '', role: '', tenantId: '', token: '', userId: '' };
  }

  return {
    branchId: window.localStorage.getItem(branchKey) ?? '',
    refreshToken: window.localStorage.getItem(refreshTokenKey) ?? '',
    role: window.localStorage.getItem(roleKey) ?? '',
    tenantId: window.localStorage.getItem(tenantKey) ?? '',
    token: window.localStorage.getItem(tokenKey) ?? '',
    userId: window.localStorage.getItem(userKey) ?? '',
  };
}

export function writeCmsSettings(
  branchId: string,
  token: string,
  tenantId = '',
  refreshToken = '',
  role = '',
  userId = '',
): void {
  window.localStorage.setItem(branchKey, branchId);
  window.localStorage.setItem(tokenKey, token);
  if (tenantId) {
    window.localStorage.setItem(tenantKey, tenantId);
  }
  if (refreshToken) {
    window.localStorage.setItem(refreshTokenKey, refreshToken);
  }
  if (role) {
    window.localStorage.setItem(roleKey, role);
  }
  if (userId) {
    window.localStorage.setItem(userKey, userId);
  }
}

export function readCmsPermissions(): string[] {
  if (!hasStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(permissionsKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function writeCmsPermissions(permissions: string[]): void {
  if (!hasStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(permissionsKey, JSON.stringify(permissions));
  } catch {
    // Private-mode or blocked storage: the provider falls back to deriving them.
  }
}

export function writeCmsTokens(token: string, refreshToken: string): void {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(refreshTokenKey, refreshToken);
}

export function clearCmsSettings(): void {
  window.localStorage.removeItem(branchKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.localStorage.removeItem(roleKey);
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(tenantKey);
  window.localStorage.removeItem(userKey);
  window.localStorage.removeItem(permissionsKey);
}
