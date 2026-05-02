const branchKey = 'restaurent:cms:branchId';
const tokenKey = 'restaurent:cms:accessToken';
const tenantKey = 'restaurent:cms:tenantId';

export function readCmsSettings(): { branchId: string; tenantId: string; token: string } {
  return {
    branchId: window.localStorage.getItem(branchKey) ?? '',
    tenantId: window.localStorage.getItem(tenantKey) ?? '',
    token: window.localStorage.getItem(tokenKey) ?? '',
  };
}

export function writeCmsSettings(branchId: string, token: string, tenantId = ''): void {
  window.localStorage.setItem(branchKey, branchId);
  window.localStorage.setItem(tokenKey, token);
  if (tenantId) {
    window.localStorage.setItem(tenantKey, tenantId);
  }
}
