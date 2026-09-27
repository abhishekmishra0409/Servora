import { Armchair } from 'lucide-react';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { BrandLogo } from '@/components/brand-logo';
import { loadTableContext } from '@/lib/table-context.server';

export default async function CustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const base = `/r/${resolvedParams.tenantSlug}/${resolvedParams.branchSlug}/t/${resolvedParams.qrToken}`;
  const { context } = await loadTableContext(resolvedParams.qrToken);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 md:max-w-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo href={base} size="sm" variant="mark" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{context?.branch.name ?? 'Servora'}</p>
              {context ? (
                <p className="truncate text-[11px] text-muted-foreground">{context.tenant.legalName}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Table ordering</p>
              )}
            </div>
          </div>
          {context ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Armchair aria-hidden="true" className="size-3.5" />
              Table {context.table.tableNo}
            </span>
          ) : null}
        </div>
      </header>
      {children}
      <BottomNav basePath={base} />
    </div>
  );
}
