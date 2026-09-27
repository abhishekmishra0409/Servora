'use client';

import { Check, ChevronsUpDown, Search, Settings2, Store } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { InlineSpinner } from '@/components/loading-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { CmsSessionBranch } from '@/lib/api-client';
import { humanize } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

/** Menus with more outlets than this get a filter box. */
const SEARCH_THRESHOLD = 5;

/** Soft tints so the tile never competes with the solid brand mark above it. */
const tilePalette = [
  'bg-accent text-accent-foreground',
  'bg-info-foreground text-info',
  'bg-success-foreground text-success',
  'bg-warning-foreground text-warning',
  'bg-secondary text-secondary-foreground',
];

/** Two-letter monogram so outlets are distinguishable at a glance. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2);
  return letters.toUpperCase() || '··';
}

function OutletTile({ index, name, size = 'md' }: { index: number; name: string; size?: 'sm' | 'md' }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-wide ring-1 ring-inset ring-current/15',
        size === 'md' ? 'size-9 text-[11px]' : 'size-7 text-[10px]',
        tilePalette[index % tilePalette.length],
      )}
    >
      {initials(name)}
    </span>
  );
}

const cardBase = 'flex w-full items-center gap-3 rounded-xl border bg-card px-2.5 py-2 text-left';

/**
 * Current outlet plus a menu to jump to another one. A single-outlet account
 * sees a static card instead of a menu with one choice, and an account with
 * outlets but none selected is prompted to pick one.
 */
export function OutletSwitcher({
  branchId,
  branches,
  canManage = false,
  onChange,
  restaurantName,
  switching,
}: {
  branchId: string;
  branches: CmsSessionBranch[];
  canManage?: boolean;
  onChange: (branchId: string) => void;
  restaurantName?: string | undefined;
  switching: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const foundIndex = branches.findIndex((branch) => branch.branchId === branchId);
  // No match means no outlet is selected yet; never pretend the first one is active.
  const current = foundIndex >= 0 ? branches[foundIndex] : undefined;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return branches
      .map((branch, index) => ({ branch, index }))
      .filter(({ branch }) => !needle || branch.name.toLowerCase().includes(needle) || branch.roleKey.includes(needle));
  }, [branches, query]);

  // Outlets arrive with the session; hold the space instead of flashing a placeholder.
  if (branches.length === 0) {
    return (
      <div aria-busy="true" aria-label="Loading outlet" className={cardBase} role="status">
        <Skeleton className="size-9 rounded-lg" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
    );
  }

  const secondLine = switching
    ? 'Switching outlet…'
    : current
      ? restaurantName || `${humanize(current.roleKey)} access`
      : `${branches.length} outlets available`;

  const summary = (
    <>
      {current ? (
        <OutletTile index={foundIndex} name={current.name} />
      ) : (
        <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 text-primary">
          <Store className="size-4" />
        </span>
      )}
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate text-sm font-semibold text-foreground">{current?.name ?? 'Choose an outlet'}</span>
        <span className={cn('truncate text-xs', current ? 'text-muted-foreground' : 'font-medium text-primary')} title={secondLine}>
          {secondLine}
        </span>
      </span>
    </>
  );

  if (branches.length === 1 && current) {
    return <div className={cn(cardBase, 'bg-card/60')}>{summary}</div>;
  }

  return (
    <DropdownMenu
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      open={open}
    >
      <DropdownMenuTrigger
        aria-label={current ? `Current outlet ${current.name}. Switch outlet` : 'Choose an outlet'}
        className={cn(
          cardBase,
          'group shadow-xs transition-[border-color,background-color,box-shadow] duration-150',
          'hover:border-primary/35 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          'data-[state=open]:border-primary/45 data-[state=open]:bg-accent/30 data-[state=open]:ring-[3px] data-[state=open]:ring-ring/15',
          'disabled:cursor-wait disabled:opacity-70',
          !current && 'border-dashed border-primary/45 bg-accent/20',
        )}
        disabled={switching}
      >
        {summary}
        <span
          aria-hidden="true"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-background/80 group-hover:text-foreground"
        >
          {switching ? <InlineSpinner /> : <ChevronsUpDown className="size-4" />}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl p-1.5 shadow-lg"
        sideOffset={6}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Outlets
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">{branches.length}</span>
        </DropdownMenuLabel>

        {branches.length > SEARCH_THRESHOLD ? (
          <div className="relative px-1 pb-1.5">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-[60%] text-muted-foreground" />
            <input
              aria-label="Find an outlet"
              autoFocus
              className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30"
              onChange={(event) => setQuery(event.target.value)}
              // Keep the menu's type-ahead from stealing keystrokes.
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Find an outlet"
              value={query}
            />
          </div>
        ) : null}

        <DropdownMenuGroup className="scrollbar-thin max-h-72 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No outlet matches “{query}”</p>
          ) : (
            visible.map(({ branch, index }) => {
              const active = branch.branchId === branchId;
              return (
                <DropdownMenuItem
                  aria-current={active ? 'true' : undefined}
                  className={cn('gap-3 rounded-lg px-2 py-2', active && 'bg-accent/50 focus:bg-accent/60')}
                  key={branch.branchId}
                  onSelect={() => {
                    if (!active) onChange(branch.branchId);
                  }}
                >
                  <OutletTile index={index} name={branch.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{branch.name}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {humanize(branch.roleKey)}
                  </span>
                  <Check aria-hidden="true" className={cn('size-4 shrink-0 text-primary', active ? 'opacity-100' : 'opacity-0')} />
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>

        {canManage ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem asChild className="gap-3 rounded-lg px-2 py-2 text-muted-foreground focus:text-foreground">
              <Link href="/branches">
                <span className="inline-flex size-7 items-center justify-center rounded-lg border border-dashed">
                  <Settings2 aria-hidden="true" className="size-3.5" />
                </span>
                <span className="text-sm">Manage outlets</span>
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
