'use client';

import { Building2, LogIn, RefreshCw, Store, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import type { CmsResource } from '@/lib/use-cms-resource';

/**
 * Renders every non-content state of a `useCmsResource` in one consistent way:
 * missing outlet or restaurant, ended session, a failed first load, and a
 * failed background refresh over data that is still on screen.
 *
 * Returns null while loading or when the data is fine, so the page renders its
 * own skeleton or content.
 */
export function ResourceNotice({
  resource,
  what,
}: {
  resource: Pick<CmsResource<unknown>, 'error' | 'refreshing' | 'reload' | 'status'>;
  /** Plain noun for the data, e.g. "orders" or "the audit log". */
  what: string;
}): ReactNode {
  switch (resource.status) {
    case 'no-outlet':
      return (
        <EmptyState
          description="Pick an outlet from the switcher at the top of the sidebar. If none are listed, ask the restaurant owner to give you access to one."
          icon={Store}
          title="Choose an outlet to continue"
        />
      );
    case 'no-tenant':
      return (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link href="/login">Sign in with another account</Link>
            </Button>
          }
          description="This login is not connected to a restaurant yet. Ask your platform administrator to link it."
          icon={Building2}
          title="No restaurant on this account"
        />
      );
    case 'signed-out':
      return (
        <EmptyState
          action={
            <Button asChild>
              <Link href="/login">
                <LogIn />
                Sign in again
              </Link>
            </Button>
          }
          description="For your security the session expired. Sign in again to pick up where you left off."
          icon={LogIn}
          title="Your session has ended"
        />
      );
    case 'error':
      return <ErrorState message={resource.error} onRetry={() => void resource.reload()} title={`Couldn’t load ${what}`} />;
    case 'ready':
      return resource.error && !resource.refreshing ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-foreground px-4 py-2.5 text-sm text-warning"
          role="status"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Showing the last loaded {what}. Refreshing failed: {resource.error}
          </span>
          <Button onClick={() => void resource.reload()} size="sm" type="button" variant="outline">
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : null;
    default:
      return null;
  }
}

/** True when the page should render its content area (skeleton or data). */
export function showsContent(resource: Pick<CmsResource<unknown>, 'status'>): boolean {
  return resource.status === 'loading' || resource.status === 'ready';
}
