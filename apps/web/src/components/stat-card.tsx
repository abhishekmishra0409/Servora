import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import type { StatusTone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

const toneStyles: Record<StatusTone, { bar: string; icon: string }> = {
  default: { bar: 'bg-border', icon: 'bg-muted text-muted-foreground' },
  destructive: { bar: 'bg-destructive', icon: 'bg-destructive/10 text-destructive' },
  info: { bar: 'bg-info', icon: 'bg-info-foreground text-info' },
  primary: { bar: 'bg-primary', icon: 'bg-accent text-accent-foreground' },
  success: { bar: 'bg-success', icon: 'bg-success-foreground text-success' },
  warning: { bar: 'bg-warning', icon: 'bg-warning-foreground text-warning' },
};

export function StatCard({
  className,
  hint,
  icon: Icon,
  label,
  tone = 'default',
  value,
}: {
  className?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  label: string;
  tone?: StatusTone;
  value: ReactNode;
}): ReactNode {
  const styles = toneStyles[tone];

  return (
    <Card className={cn('relative gap-2 overflow-hidden px-5 py-4 shadow-card', className)}>
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-lg', styles.icon)}>
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <section className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</section>;
}
