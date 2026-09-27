'use client';

import { useParams } from 'next/navigation';

import { TenantDetail } from '../../_components/tenant-detail';

export default function TenantDetailRoute() {
  const params = useParams<{ id: string }>();
  return <TenantDetail tenantId={params.id} />;
}
