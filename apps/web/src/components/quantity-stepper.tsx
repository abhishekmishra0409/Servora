'use client';

import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  className,
  disabled = false,
  label = 'Quantity',
  max = 99,
  min = 1,
  onChange,
  size = 'md',
  value,
}: {
  className?: string;
  disabled?: boolean;
  label?: string;
  max?: number;
  min?: number;
  onChange: (next: number) => void;
  size?: 'sm' | 'md';
  value: number;
}): ReactNode {
  const buttonSize = size === 'sm' ? 'icon-sm' : 'icon';

  return (
    <div aria-label={label} className={cn('inline-flex items-center gap-1 rounded-lg border bg-card p-0.5', className)} role="group">
      <Button
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        size={buttonSize}
        type="button"
        variant="ghost"
      >
        <Minus />
      </Button>
      <span aria-live="polite" className={cn('min-w-8 text-center font-semibold tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')}>
        {value}
      </span>
      <Button
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        size={buttonSize}
        type="button"
        variant="ghost"
      >
        <Plus />
      </Button>
    </div>
  );
}
