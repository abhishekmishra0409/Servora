'use client';

import { ArrowRight, ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';

/**
 * Sticky summary pinned just above the bottom nav. Renders nothing when the
 * bucket is empty so the menu keeps its full height.
 */
export function CartBar({
  count,
  disabled = false,
  href,
  label = 'View bucket',
  onClick,
  total,
}: {
  count: number;
  disabled?: boolean;
  href?: string;
  label?: string;
  onClick?: () => void;
  total: number;
}): ReactNode {
  if (count <= 0) {
    return null;
  }

  const content = (
    <>
      <span className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-bold tabular-nums">
          {count}
        </span>
        {label}
      </span>
      <span className="flex items-center gap-2 tabular-nums">
        {money(total)}
        <ArrowRight aria-hidden="true" className="size-4" />
      </span>
    </>
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-2 md:left-1/2 md:w-[560px] md:-translate-x-1/2">
      <Button
        asChild={Boolean(href)}
        className="pointer-events-auto h-12 w-full justify-between rounded-xl px-4 text-sm font-semibold shadow-lg shadow-primary/25"
        disabled={disabled}
        onClick={onClick}
        size="lg"
        type="button"
      >
        {href ? (
          <Link href={href}>
            <ShoppingBasket aria-hidden="true" className="sr-only" />
            {content}
          </Link>
        ) : (
          content
        )}
      </Button>
    </div>
  );
}
