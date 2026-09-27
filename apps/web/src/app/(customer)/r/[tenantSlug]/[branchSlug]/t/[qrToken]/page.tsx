import { loadTableContext } from '@/lib/table-context.server';

import { CustomerLandingClient } from './customer-landing-client';

export const dynamic = 'force-dynamic';

export default async function CustomerLandingPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const { context, error } = await loadTableContext(resolvedParams.qrToken);

  return <CustomerLandingClient initialContext={context} initialError={error} />;
}
