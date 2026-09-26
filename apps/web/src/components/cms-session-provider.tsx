"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getCmsEntitlements,
  getCmsSessionContext,
  type CmsEntitlements,
  type CmsSessionBranch,
} from '../lib/api-client';
import { readCmsSettings, readCmsPermissions, writeCmsPermissions } from '../lib/cms-storage';
import { fallbackPermissionsForRole } from '../lib/role-access';

export interface CmsSession {
  branchId: string;
  branches: CmsSessionBranch[];
  can: (...required: string[]) => boolean;
  entitlements: CmsEntitlements | null;
  permissions: ReadonlySet<string>;
  refreshEntitlements: () => Promise<void>;
  reload: () => Promise<void>;
  role: string;
  tenantId: string;
  token: string;
  userId: string;
}

const SessionContext = createContext<CmsSession | null>(null);

/**
 * Holds the current user's effective permissions for the whole CMS.
 *
 * Permissions are seeded synchronously from localStorage (or derived locally
 * for a built-in role) so the sidebar is correct on the first paint, then
 * revalidated against `/auth/session` after mount. These values drive rendering
 * only — the API's PermissionsGuard is what actually authorises anything, and
 * localStorage is user-editable.
 */
export function CmsSessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [settings] = useState(() => readCmsSettings());
  const [permissions, setPermissions] = useState<ReadonlySet<string>>(() => {
    const stored = readCmsPermissions();
    return stored.length > 0 ? new Set(stored) : fallbackPermissionsForRole(settings.role);
  });
  const [branches, setBranches] = useState<CmsSessionBranch[]>([]);
  const [entitlements, setEntitlements] = useState<CmsEntitlements | null>(null);
  const [role, setRole] = useState(settings.role);

  const reload = useCallback(async () => {
    const current = readCmsSettings();

    if (!current.token) {
      return;
    }

    try {
      const context = await getCmsSessionContext(current.token);
      setPermissions(new Set(context.permissions));
      setBranches(context.branches ?? []);
      setEntitlements(context.entitlements);
      setRole(context.role);
      writeCmsPermissions(context.permissions);
    } catch {
      // Keep the locally-derived set; the guard still protects every call.
    }
  }, []);

  const refreshEntitlements = useCallback(async () => {
    const current = readCmsSettings();

    if (!current.token || !current.tenantId) {
      return;
    }

    try {
      setEntitlements(await getCmsEntitlements(current.tenantId, current.token));
    } catch {
      // Usage meters are advisory; a failure here must not break the page.
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Another tab logged in, switched outlet, or had its role changed.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key?.startsWith('restaurent:cms:')) {
        void reload();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  const value = useMemo<CmsSession>(
    () => ({
      branchId: settings.branchId,
      branches,
      can: (...required: string[]) =>
        required.length === 0 || required.some((permission) => permissions.has(permission)),
      entitlements,
      permissions,
      refreshEntitlements,
      reload,
      role,
      tenantId: settings.tenantId,
      token: settings.token,
      userId: settings.userId,
    }),
    [branches, entitlements, permissions, refreshEntitlements, reload, role, settings],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useCmsSession(): CmsSession {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useCmsSession must be used inside CmsSessionProvider');
  }

  return session;
}
