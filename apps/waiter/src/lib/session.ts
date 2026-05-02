import type { StaffSession } from './api-client';

const sessionKey = 'restaurent:waiter:session';
const branchKey = 'restaurent:waiter:branchId';

export const defaultBranchId = (): string => localStorage.getItem(branchKey) ?? import.meta.env.VITE_BRANCH_ID ?? '';

export function readSession(): StaffSession | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StaffSession;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export function writeSession(session: StaffSession, branchId: string): void {
  localStorage.setItem(sessionKey, JSON.stringify(session));
  const nextBranchId = branchId || session.branchId;
  if (nextBranchId) {
    localStorage.setItem(branchKey, nextBranchId);
  }
}

export function clearSession(): void {
  localStorage.removeItem(sessionKey);
  localStorage.removeItem(branchKey);
}
