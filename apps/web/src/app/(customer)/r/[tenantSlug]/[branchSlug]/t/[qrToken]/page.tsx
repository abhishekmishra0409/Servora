import type { TableContext } from '@/lib/api-client';

import { CustomerLandingClient } from './customer-landing-client';

export const dynamic = 'force-dynamic';

async function loadInitialContext(qrToken: string): Promise<{ context: TableContext | null; error: string }> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/v1/public/table-context?qrToken=${encodeURIComponent(qrToken)}`,
      { cache: 'no-store' },
    );
    const payload = (await response.json().catch(() => null)) as TableContext | { message?: string } | null;

    if (!response.ok) {
      return {
        context: null,
        error: payload && 'message' in payload && payload.message ? payload.message : 'Could not load this table.',
      };
    }

    return { context: payload as TableContext, error: '' };
  } catch (error) {
    return { context: null, error: error instanceof Error ? error.message : 'Could not load this table.' };
  }
}

export default async function CustomerLandingPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const { context, error } = await loadInitialContext(resolvedParams.qrToken);

  return <CustomerLandingClient initialContext={context} initialError={error} />;
}
