'use client';

import { Info, RefreshCw, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}): ReactNode {
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        {onRetry ? (
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            <RefreshCw />
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/** Quiet inline notice for informational copy that is not an error. */
export function NoticeBanner({
  children,
  className,
  tone = 'warning',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'warning' | 'info';
}): ReactNode {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm',
        tone === 'warning' && 'border-warning/30 bg-warning-foreground text-warning',
        tone === 'info' && 'border-info/30 bg-info-foreground text-info',
        className,
      )}
      role="status"
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
