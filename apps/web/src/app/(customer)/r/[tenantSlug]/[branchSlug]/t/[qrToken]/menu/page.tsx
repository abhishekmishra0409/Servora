import type { MenuCategory, MenuItem } from '@restaurent/shared';
import { cookies } from 'next/headers';

import type { GuestSession, TableContext } from '@/lib/api-client';
import { guestSessionCookieName } from '@/lib/customer-storage';

import { CustomerMenuClient } from './customer-menu-client';

export const dynamic = 'force-dynamic';

type InitialMenu = {
  categories: MenuCategory[];
  context: TableContext | null;
  error: string;
  items: MenuItem[];
};

async function loadInitialMenu(qrToken: string): Promise<InitialMenu> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const baseUrl = apiUrl.replace(/\/$/, '');

  try {
    const tableResponse = await fetch(
      `${baseUrl}/api/v1/public/table-context?qrToken=${encodeURIComponent(qrToken)}`,
      { cache: 'no-store' },
    );
    const tablePayload = (await tableResponse.json().catch(() => null)) as TableContext | { message?: string } | null;

    if (!tableResponse.ok || !tablePayload || !('tenant' in tablePayload)) {
      return {
        categories: [],
        context: null,
        error:
          tablePayload && 'message' in tablePayload && tablePayload.message
            ? tablePayload.message
            : 'Could not load this table.',
        items: [],
      };
    }

    const menuResponse = await fetch(
      `${baseUrl}/api/v1/menu?tenantId=${encodeURIComponent(tablePayload.tenant.id)}&branchId=${encodeURIComponent(tablePayload.branch.id)}`,
      { cache: 'no-store' },
    );
    const menuPayload = (await menuResponse.json().catch(() => null)) as
      | { categories?: MenuCategory[]; items?: MenuItem[]; message?: string }
      | null;

    if (!menuResponse.ok || !menuPayload) {
      return {
        categories: [],
        context: tablePayload,
        error: menuPayload?.message ?? 'Could not load menu.',
        items: [],
      };
    }

    return {
      categories: menuPayload.categories ?? [],
      context: tablePayload,
      error: '',
      items: menuPayload.items ?? [],
    };
  } catch (error) {
    return {
      categories: [],
      context: null,
      error: error instanceof Error ? error.message : 'Could not load menu.',
      items: [],
    };
  }
}

async function readInitialGuest(qrToken: string): Promise<GuestSession | null> {
  const raw = (await cookies()).get(guestSessionCookieName(qrToken))?.value;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(raw)) as GuestSession;
  } catch {
    return null;
  }
}

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const [initialMenu, initialGuest] = await Promise.all([
    loadInitialMenu(resolvedParams.qrToken),
    readInitialGuest(resolvedParams.qrToken),
  ]);

  return (
    <CustomerMenuClient
      initialCategories={initialMenu.categories}
      initialContext={initialMenu.context}
      initialError={initialMenu.error}
      initialGuest={initialGuest}
      initialItems={initialMenu.items}
    />
  );
}
