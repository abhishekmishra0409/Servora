'use client';

import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';
import { ResourceNotice, showsContent } from '@/components/resource-notice';
import type { CmsResource } from '@/lib/use-cms-resource';
import { cn } from '@/lib/utils';

/**
 * Standard CMS page frame.
 *
 * Pass the page's main `resource` and every data state is handled here, the
 * same way on every screen: the notice (no outlet, session ended, load failed,
 * stale data) sits under the header; content is hidden when it would be
 * misleading; and the header gets a Refresh button that shows progress.
 */
export function PageShell({
  actions,
  children,
  className,
  description,
  eyebrow,
  onRefresh,
  refreshing,
  resource,
  title,
  what = 'this page',
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string | undefined;
  eyebrow?: string | undefined;
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
  resource?: Pick<CmsResource<unknown>, 'error' | 'refreshing' | 'reload' | 'status'> | undefined;
  title?: string;
  /** Plain noun for the resource, used in its messages, e.g. "floors". */
  what?: string;
}): ReactNode {
  const refresh = onRefresh ?? (resource ? () => void resource.reload() : undefined);
  const busy = refreshing ?? (resource ? resource.refreshing || resource.status === 'loading' : undefined);
  const content = !resource || showsContent(resource);

  return (
    <main className={cn('mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8', className)}>
      {title ? (
        <PageHeader
          actions={content ? actions : undefined}
          description={description}
          eyebrow={eyebrow}
          onRefresh={content ? refresh : undefined}
          refreshing={busy}
          title={title}
        />
      ) : null}
      {resource ? <ResourceNotice resource={resource} what={what} /> : null}
      {content ? children : null}
    </main>
  );
}
