const branchKey = 'restaurent:cms:branchId';
const refreshTokenKey = 'restaurent:cms:refreshToken';
const roleKey = 'restaurent:cms:role';
const tokenKey = 'restaurent:cms:accessToken';
const tenantKey = 'restaurent:cms:tenantId';
const userKey = 'restaurent:cms:userId';

export function readCmsSettings(): {
  branchId: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  token: string;
  userId: string;
} {
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
}
