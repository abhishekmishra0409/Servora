'use client';

import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import type { AsyncState } from '@/lib/async-state';

/** Common frame for every platform console route. */
export function PlatformPage({
  actions,
  children,
  description,
  onRefresh,
  refreshing = false,
  state,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean;
  state?: AsyncState | undefined;
  title: string;
}): ReactNode {
  return (
    <PageShell>
      <PageHeader actions={actions} description={description} eyebrow="Platform" onRefresh={onRefresh} refreshing={refreshing} title={title} />
      {state?.status === 'error' ? <ErrorState message={state.error ?? ''} onRetry={onRefresh} /> : null}
      {children}
    </PageShell>
  );
}
