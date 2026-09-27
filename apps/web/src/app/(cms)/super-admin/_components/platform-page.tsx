'use client';

import type { ReactNode } from 'react';

import { PageShell } from '@/components/page-shell';
import type { CmsResource } from '@/lib/use-cms-resource';

/** Common frame for every platform console route. */
export function PlatformPage({
  actions,
  children,
  description,
  onRefresh,
  refreshing,
  state,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
  state?: Pick<CmsResource<unknown>, 'error' | 'refreshing' | 'reload' | 'status'> | undefined;
  title: string;
}): ReactNode {
  return (
    <PageShell
      actions={actions}
      description={description}
      eyebrow="Platform"
      onRefresh={onRefresh}
      refreshing={refreshing}
      resource={state}
      title={title}
      what="platform data"
    >
      {children}
    </PageShell>
  );
}
