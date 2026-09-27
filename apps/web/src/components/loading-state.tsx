import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** List rows: icon tile, two text lines, trailing badge. Matches the divided lists used across the CMS. */
export function LoadingRows({ className, count = 4 }: { className?: string; count?: number }): ReactNode {
  return (
    <div aria-busy="true" aria-label="Loading" className={cn('divide-y', className)} role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className="flex items-center gap-3 py-3" key={index}>
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className={cn('h-3.5', index % 2 ? 'w-1/3' : 'w-1/2')} />
            <Skeleton className="h-2.5 w-1/4 opacity-70" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

type CardVariant = 'plain' | 'qr' | 'menu' | 'plan';

function CardSkeleton({ variant }: { variant: CardVariant }): ReactNode {
  if (variant === 'qr') {
    return (
      <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="grid gap-2.5 p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'plan') {
    return (
      <div className="grid gap-4 rounded-xl border bg-card p-5 shadow-card">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton className="h-8" key={index} />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5 shadow-card">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function LoadingCards({
  className,
  count = 3,
  variant = 'plain',
}: {
  className?: string;
  count?: number;
  variant?: CardVariant;
}): ReactNode {
  return (
    <div aria-busy="true" aria-label="Loading" className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)} role="status">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} variant={variant} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Lanes of ticket placeholders, sized like `KanbanBoard`. */
export function LoadingKanban({ columns = 4 }: { columns?: number }): ReactNode {
  return (
    <div aria-busy="true" aria-label="Loading board" className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" role="status">
      <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4">
        {Array.from({ length: columns }, (_, column) => (
          <div className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-t-4 bg-muted/40 p-3" key={column}>
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            {Array.from({ length: column === 0 ? 2 : 1 }, (_, ticket) => (
              <div className="grid gap-2.5 rounded-xl border bg-card p-4" key={ticket}>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="mt-1 h-8 w-28" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Full-page placeholder: header, stat row, and a content panel. Used for route transitions. */
export function PageSkeleton(): ReactNode {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8" role="status">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton className="h-28 rounded-xl" key={index} />
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <Skeleton className="mb-4 h-4 w-40" />
        <LoadingRows count={5} />
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export function PageLoading({ label = 'Loading' }: { label?: string }): ReactNode {
  return (
    <div aria-busy="true" className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }): ReactNode {
  return <Loader2 aria-hidden="true" className={cn('size-4 animate-spin', className)} />;
}
