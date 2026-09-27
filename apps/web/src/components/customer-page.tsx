import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Scroll container for guest screens. Bottom padding clears the fixed nav and,
 * when present, the cart bar, so the last card is never hidden under them.
 */
export function CustomerPage({
  children,
  className,
  hasCartBar = false,
}: {
  children: ReactNode;
  className?: string;
  hasCartBar?: boolean;
}): ReactNode {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-md space-y-4 px-4 pt-4 md:max-w-2xl',
        hasCartBar ? 'pb-[calc(9.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function CustomerHeading({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description?: string | undefined;
  eyebrow?: string | undefined;
  title: string;
}): ReactNode {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
