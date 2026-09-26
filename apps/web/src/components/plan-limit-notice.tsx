"use client";

import Link from 'next/link';

import { useCmsSession } from './cms-session-provider';
import type { ApiError } from '../lib/api-client';

/** `0` means unlimited, matching the API's limit convention. */
const isUnlimited = (cap: number): boolean => !cap || cap <= 0;

export function UsageMeter({ cap, label, used }: { cap: number; label: string; used: number }): React.ReactElement {
  const unlimited = isUnlimited(cap);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / cap) * 100));
  const tone = unlimited ? '' : used >= cap ? ' usage-meter--blocked' : pct >= 80 ? ' usage-meter--warn' : '';

  return (
    <article className={`card kpi cms-kpi usage-meter${tone}`}>
      <strong>{unlimited ? String(used) : `${used} / ${cap}`}</strong>
      <span className="muted">{label}</span>
      {unlimited ? null : (
        <span aria-hidden="true" className="usage-meter__bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
    </article>
  );
}

/** Compact "12 / 25 used" line shown directly above a create form. */
export function UsageStrip({ cap, label, used }: { cap: number; label: string; used: number }): React.ReactElement | null {
  const { can } = useCmsSession();

  if (isUnlimited(cap)) {
    return null;
  }

  const blocked = used >= cap;

  return (
    <div className={`usage-strip${blocked ? ' usage-strip--blocked' : ''}`}>
      <span>
        <strong>{label}:</strong> {used} of {cap} used
      </span>
      {blocked && can('subscription:view') ? (
        <Link className="button-secondary" href="/subscription">Upgrade plan</Link>
      ) : null}
    </div>
  );
}

/**
 * Rendered where a create failed. Only reacts to the structured plan-limit
 * code, so a permission denial never shows an upgrade prompt.
 */
export function PlanLimitNotice({
  error,
  resource,
}: {
  error: ApiError | null;
  resource: string;
}): React.ReactElement | null {
  const { can } = useCmsSession();

  if (!error || error.code !== 'PLAN_LIMIT_REACHED') {
    return null;
  }

  return (
    <section className="panel limit-block">
      <span className="pill">Plan limit reached</span>
      <h2>{error.message}</h2>
      <p className="muted">Your existing {resource} keep working. Upgrade to add more.</p>
      {can('subscription:view') ? (
        <div className="action-row">
          <Link className="button-secondary" href="/subscription">See plans</Link>
        </div>
      ) : (
        <p className="muted">Ask the restaurant owner to upgrade the plan.</p>
      )}
    </section>
  );
}
