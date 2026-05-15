import type { TableContext } from '@/lib/api-client';

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

export default async function CustomerBucketPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const initialContext = await loadInitialContext(resolvedParams.qrToken);

  return (
    <CustomerBucketClient
      initialContext={initialContext.context}
      initialError={initialContext.error}
      initialGuest={null}
    />
  );
}
