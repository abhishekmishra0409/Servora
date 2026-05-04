const branchKey = 'restaurent:cms:branchId';
const refreshTokenKey = 'restaurent:cms:refreshToken';
const tokenKey = 'restaurent:cms:accessToken';
const tenantKey = 'restaurent:cms:tenantId';

export function readCmsSettings(): { branchId: string; refreshToken: string; tenantId: string; token: string } {
  return {
    branchId: window.localStorage.getItem(branchKey) ?? '',
    refreshToken: window.localStorage.getItem(refreshTokenKey) ?? '',
    tenantId: window.localStorage.getItem(tenantKey) ?? '',
    token: window.localStorage.getItem(tokenKey) ?? '',
  };
}

export function writeCmsSettings(branchId: string, token: string, tenantId = '', refreshToken = ''): void {
  window.localStorage.setItem(branchKey, branchId);
  window.localStorage.setItem(tokenKey, token);
  if (tenantId) {
    window.localStorage.setItem(tenantKey, tenantId);
  }
  if (refreshToken) {
    window.localStorage.setItem(refreshTokenKey, refreshToken);
  }
}

export function writeCmsTokens(token: string, refreshToken: string): void {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(refreshTokenKey, refreshToken);
}

export function clearCmsSettings(): void {
  window.localStorage.removeItem(branchKey);
  window.localStorage.removeItem(refreshTokenKey);
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(tenantKey);
}
