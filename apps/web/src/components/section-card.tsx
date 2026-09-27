import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SectionCard({
  actions,
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string | undefined;
  title?: string | undefined;
}): ReactNode {
  return (
    <Card className={cn('shadow-card', className)}>
      {title || actions ? (
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {title ? <CardTitle className="text-base font-semibold">{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('space-y-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
