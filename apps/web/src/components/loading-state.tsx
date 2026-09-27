import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LoadingRows({ className, count = 4 }: { className?: string; count?: number }): ReactNode {
  return (
    <div aria-busy="true" aria-label="Loading" className={cn('space-y-2', className)} role="status">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="h-12 w-full rounded-lg" key={index} />
      ))}
    </div>
  );
}

export function LoadingCards({ className, count = 3 }: { className?: string; count?: number }): ReactNode {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="h-36 w-full rounded-xl" key={index} />
      ))}
    </div>
  );
}

export function PageLoading({ label = 'Loading' }: { label?: string }): ReactNode {
  return (
    <div
      aria-busy="true"
      className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }): ReactNode {
  return <Loader2 aria-hidden="true" className={cn('size-4 animate-spin', className)} />;
}
