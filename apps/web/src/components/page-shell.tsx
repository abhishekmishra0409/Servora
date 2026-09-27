import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

/**
 * Standard CMS page frame. Pass `title` to get a `PageHeader`, or omit it and
 * compose the header yourself.
 */
export function PageShell({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
  toolbar,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title?: string;
  /** @deprecated use `actions`; kept so unmigrated pages keep compiling. */
  toolbar?: ReactNode;
}): ReactNode {
  return (
    <main className={cn('mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8', className)}>
      {title ? (
        <PageHeader actions={actions ?? toolbar} description={description} eyebrow={eyebrow} title={title} />
      ) : null}
      {children}
    </main>
  );
}
