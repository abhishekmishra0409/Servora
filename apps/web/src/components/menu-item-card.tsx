'use client';

import type { MenuItem } from '@restaurent/shared';
import { Plus, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export function DietaryDot({ flag }: { flag: string }): ReactNode {
  const nonVeg = flag.toLowerCase().includes('non');
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 rounded-full', nonVeg ? 'bg-destructive' : 'bg-success')}
    />
  );
}

export function MenuItemCard({ item, onOpen }: { item: MenuItem; onOpen: (item: MenuItem) => void }): ReactNode {
  const primaryFlag = item.dietaryFlags[0];
  const hasOptions = item.variants.length > 0 || item.addonGroups.length > 0;

  return (
    <article
      className={cn('flex gap-3 rounded-xl border bg-card p-3 shadow-card transition-colors', !item.available && 'opacity-60')}
    >
      <button
        aria-label={`${item.name}, ${money(item.price)}`}
        className="flex min-w-0 flex-1 gap-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-lg"
        disabled={!item.available}
        onClick={() => onOpen(item)}
        type="button"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <img alt="" className="size-full object-cover" loading="lazy" src={item.imageUrl} />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground/40">
              <UtensilsCrossed aria-hidden="true" className="size-7" />
            </div>
          )}
          {!item.available ? (
            <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-background">
              Sold out
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            {primaryFlag ? <DietaryDot flag={primaryFlag} /> : null}
            <h2 className="truncate text-sm font-semibold">{item.name}</h2>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-sm font-semibold tabular-nums">{money(item.price)}</span>
            {hasOptions ? (
              <Badge className="text-[10px]" variant="outline">
                Customisable
              </Badge>
            ) : null}
          </div>
        </div>
      </button>
      <div className="flex shrink-0 items-end">
        <Button aria-label={`Add ${item.name}`} disabled={!item.available} onClick={() => onOpen(item)} size="icon-sm" type="button" variant="secondary">
          <Plus />
        </Button>
      </div>
    </article>
  );
}
