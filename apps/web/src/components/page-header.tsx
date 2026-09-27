'use client';

import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  onRefresh,
  refreshing = false,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: string | undefined;
  eyebrow?: string | undefined;
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
  title: string;
}): ReactNode {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions || onRefresh ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
          {onRefresh ? (
            <Button disabled={refreshing} onClick={onRefresh} size="sm" type="button" variant="outline">
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              Refresh
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
