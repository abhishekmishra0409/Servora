import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { humanize, toneFor, type StatusKind, type StatusTone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

const toneVariant: Record<StatusTone, 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'default'> = {
  default: 'secondary',
  destructive: 'destructive',
  info: 'info',
  primary: 'default',
  success: 'success',
  warning: 'warning',
};

export function StatusBadge({
  className,
  kind,
  label,
  value,
}: {
  className?: string;
  kind: StatusKind;
  /** Override the humanized value. */
  label?: string | undefined;
  value: string;
}): ReactNode {
  return (
    <Badge className={cn('capitalize', className)} variant={toneVariant[toneFor(kind, value)]}>
      {label ?? humanize(value)}
    </Badge>
  );
}
