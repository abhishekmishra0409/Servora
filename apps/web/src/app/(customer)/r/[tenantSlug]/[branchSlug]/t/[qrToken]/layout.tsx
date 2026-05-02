import type { ReactNode } from 'react';
import Link from 'next/link';

import { CustomerNav } from '@/components/customer-nav';

export default async function CustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const base = `/r/${resolvedParams.tenantSlug}/${resolvedParams.branchSlug}/t/${resolvedParams.qrToken}`;

  return (
    <div className="customer-app">
      <header className="customer-topbar">
        <Link href={base}>Restaurent</Link>
        <div className="customer-topbar__actions" aria-hidden="true">
          <span className="material-symbols-outlined">notifications</span>
          <span className="material-symbols-outlined">account_circle</span>
        </div>
      </header>
      {children}
      <CustomerNav basePath={base} />
    </div>
  );
}
