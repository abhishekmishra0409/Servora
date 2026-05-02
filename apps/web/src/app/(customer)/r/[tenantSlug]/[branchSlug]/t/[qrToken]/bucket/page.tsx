import { cookies } from 'next/headers';

import type { GuestSession, TableContext } from '@/lib/api-client';
import { guestSessionCookieName } from '@/lib/customer-storage';

import { CustomerBucketClient } from './customer-bucket-client';

export const dynamic = 'force-dynamic';

async function loadInitialContext(qrToken: string): Promise<{ context: TableContext | null; error: string }> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/v1/public/table-context?qrToken=${encodeURIComponent(qrToken)}`,
      { cache: 'no-store' },
    );
    const payload = (await response.json().catch(() => null)) as TableContext | { message?: string } | null;

    if (!response.ok || !payload || !('tenant' in payload)) {
      return {
        context: null,
        error:
          payload && 'message' in payload && payload.message
            ? payload.message
            : 'Could not load this bucket.',
      };
    }

    return { context: payload, error: '' };
  } catch (error) {
    return { context: null, error: error instanceof Error ? error.message : 'Could not load this bucket.' };
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

export default async function CustomerBucketPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const [initialContext, initialGuest] = await Promise.all([
    loadInitialContext(resolvedParams.qrToken),
    readInitialGuest(resolvedParams.qrToken),
  ]);

  return (
    <CustomerBucketClient
      initialContext={initialContext.context}
      initialError={initialContext.error}
      initialGuest={initialGuest}
    />
  );
}
