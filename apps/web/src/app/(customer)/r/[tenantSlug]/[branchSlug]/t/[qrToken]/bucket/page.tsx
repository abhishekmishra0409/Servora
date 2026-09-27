import { loadTableContext } from '@/lib/table-context.server';

import { CustomerBucketClient } from './customer-bucket-client';

export const dynamic = 'force-dynamic';

export default async function CustomerBucketPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const { context, error } = await loadTableContext(resolvedParams.qrToken);

  return <CustomerBucketClient initialContext={context} initialError={error} initialGuest={null} />;
}
