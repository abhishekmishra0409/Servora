'use client';

import { Check, ChevronsUpDown, Settings2, Store } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { InlineSpinner } from '@/components/loading-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CmsSessionBranch } from '@/lib/api-client';
import { humanize } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

/** Two-letter monogram so outlets are distinguishable at a glance. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2);
  return letters.toUpperCase() || '··';
}

const tilePalette = [
  'bg-primary text-primary-foreground',
  'bg-info text-white',
  'bg-success text-white',
  'bg-warning text-white',
  'bg-chart-4 text-white',
];

function tileClass(index: number): string {
  return tilePalette[index % tilePalette.length]!;
}

function OutletTile({ index, name, size = 'md' }: { index: number; name: string; size?: 'sm' | 'md' }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold',
        size === 'md' ? 'size-9 text-xs' : 'size-7 text-[10px]',
        tileClass(index),
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Current outlet plus a menu to jump to another one. A single-outlet account
 * sees a static card instead of a menu with one choice.
 */
export function OutletSwitcher({
  branchId,
  branches,
  canManage = false,
  onChange,
  switching,
}: {
  branchId: string;
  branches: CmsSessionBranch[];
  canManage?: boolean;
  onChange: (branchId: string) => void;
  switching: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const foundIndex = branches.findIndex((branch) => branch.branchId === branchId);
  // No match means no outlet is selected yet; never pretend the first one is active.
  const currentIndex = Math.max(0, foundIndex);
  const current = foundIndex >= 0 ? branches[foundIndex] : undefined;

  const summary = (
    <>
      {current ? (
        <OutletTile index={currentIndex} name={current.name} />
      ) : (
        <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 text-primary">
          <Store className="size-4" />
        </span>
      )}
      <span className="grid min-w-0 flex-1 text-left leading-tight">
        <span className="truncate text-sm font-semibold text-foreground">{current?.name ?? 'Choose an outlet'}</span>
        <span className={cn('truncate text-xs', current ? 'text-muted-foreground' : 'text-primary')}>
          {switching ? 'Switching outlet…' : current ? `${humanize(current.roleKey)} access` : `${branches.length} available`}
        </span>
      </span>
    </>
  );

  // Outlets arrive with the session; hold the space instead of flashing a placeholder name.
  if (branches.length === 0) {
    return (
      <div aria-busy="true" aria-label="Loading outlet" className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-card" role="status">
        <Skeleton className="size-9 rounded-lg" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    );
  }

  if (branches.length === 1) {
    return <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-card">{summary}</div>;
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        aria-label={`Current outlet ${current?.name ?? ''}. Switch outlet`}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-card transition-colors',
          'hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-wait disabled:opacity-70',
          (open || !current) && 'border-primary/50 bg-accent/30',
        )}
        disabled={switching}
      >
        {summary}
        {switching ? (
          <InlineSpinner className="text-muted-foreground" />
        ) : (
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl p-1.5" sideOffset={6}>
        <DropdownMenuLabel className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Switch outlet
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{branches.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuGroup className="max-h-72 overflow-y-auto">
          {branches.map((branch, index) => {
            const active = branch.branchId === branchId;
            return (
              <DropdownMenuItem
                className={cn('gap-3 rounded-lg px-2 py-2', active && 'bg-accent/50')}
                key={branch.branchId}
                onSelect={() => {
                  if (!active) onChange(branch.branchId);
                }}
              >
                <OutletTile index={index} name={branch.name} size="sm" />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">{branch.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{humanize(branch.roleKey)}</span>
                </span>
                {active ? <Check aria-label="Current outlet" className="size-4 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-3 rounded-lg px-2 py-2">
              <Link href="/branches">
                <span className="inline-flex size-7 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
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

