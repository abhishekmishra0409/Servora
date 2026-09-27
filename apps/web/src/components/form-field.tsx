import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  required = false,
}: {
  children: ReactNode;
  className?: string;
  error?: string | undefined;
  hint?: string | undefined;
  htmlFor?: string | undefined;
  label: string;
  required?: boolean;
}): ReactNode {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({
  children,
  className,
  columns = 2,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}): ReactNode {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'md:grid-cols-2',
        columns === 3 && 'md:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', className)}>{children}</div>;
}
