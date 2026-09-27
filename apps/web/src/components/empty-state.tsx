import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  action,
  className,
  compact = false,
  description,
  icon: Icon = Inbox,
  title,
}: {
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  description?: string;
  icon?: LucideIcon;
  title: string;
}): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className,
      )}
      role="status"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
