'use client';

import { Crown } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useCmsSession } from '@/components/cms-session-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/** `0` means unlimited, matching the API's limit convention. */
const isUnlimited = (cap: number): boolean => !cap || cap <= 0;

function usageTone(cap: number, used: number): 'default' | 'warning' | 'blocked' {
  if (isUnlimited(cap)) {
    return 'default';
  }
  if (used >= cap) {
    return 'blocked';
  }
  return used / cap >= 0.8 ? 'warning' : 'default';
}

export function UsageMeter({ cap, label, used }: { cap: number; label: string; used: number }): ReactNode {
  const unlimited = isUnlimited(cap);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / cap) * 100));
  const tone = usageTone(cap, used);

  return (
    <Card className="gap-2 px-5 py-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold tabular-nums">
        {unlimited ? used : (
          <>
            {used} <span className="text-base font-normal text-muted-foreground">/ {cap}</span>
          </>
        )}
      </p>
      {unlimited ? (
        <p className="text-xs text-muted-foreground">Unlimited on this plan</p>
      ) : (
        <Progress
          aria-label={`${label} usage`}
          className={cn(
            'h-1.5',
            tone === 'warning' && '[&>[data-slot=progress-indicator]]:bg-warning',
            tone === 'blocked' && '[&>[data-slot=progress-indicator]]:bg-destructive',
          )}
          value={pct}
        />
      )}
    </Card>
  );
}

/** Compact "12 of 25 used" line shown directly above a create form. */
export function UsageStrip({ cap, label, used }: { cap: number; label: string; used: number }): ReactNode {
  const { can } = useCmsSession();

  if (isUnlimited(cap)) {
    return null;
  }

  const tone = usageTone(cap, used);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-card',
        tone === 'blocked' && 'border-destructive/40',
      )}
    >
      <span>
        <span className="font-semibold">{label}:</span>{' '}
        <span className={cn('tabular-nums', tone === 'blocked' && 'text-destructive', tone === 'warning' && 'text-warning')}>
          {used} of {cap} used
        </span>
      </span>
      {tone === 'blocked' && can('subscription:view') ? (
        <Button asChild size="sm" variant="outline">
          <Link href="/subscription">Upgrade plan</Link>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Rendered where a create failed. Only reacts to the structured plan-limit
 * code, so a permission denial never shows an upgrade prompt.
 */
export function PlanLimitNotice({ error, resource }: { error: ApiError | null; resource: string }): ReactNode {
  const { can } = useCmsSession();

  if (!error || error.code !== 'PLAN_LIMIT_REACHED') {
    return null;
  }

  return (
    <Card className="gap-2 border-l-4 border-l-destructive px-5 py-4 shadow-card" role="alert">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-destructive">
        <Crown aria-hidden="true" className="size-3.5" />
        Plan limit reached
      </p>
      <p className="font-semibold">{error.message}</p>
      <p className="text-sm text-muted-foreground">Your existing {resource} keep working. Upgrade to add more.</p>
      {can('subscription:view') ? (
        <div className="pt-1">
          <Button asChild size="sm">
            <Link href="/subscription">See plans</Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Ask the restaurant owner to upgrade the plan.</p>
      )}
    </Card>
  );
}
