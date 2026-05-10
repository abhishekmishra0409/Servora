'use client';

import { useParams } from 'next/navigation';

import { SuperAdminTenantDetailPage } from '../../super-admin-console';

export default function TenantDetailRoute() {
  const params = useParams<{ id: string }>();
  return <SuperAdminTenantDetailPage tenantId={params.id} />;
}
