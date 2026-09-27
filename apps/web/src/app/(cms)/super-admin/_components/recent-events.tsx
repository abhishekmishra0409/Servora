import { Building2, CreditCard } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { LoadingRows } from '@/components/loading-state';
import { SectionCard } from '@/components/section-card';
import { Badge } from '@/components/ui/badge';

import type { PlatformEvent } from './platform-console';

export function RecentEvents({
  description = 'Derived from the current tenant and subscription records.',
  events,
  loading = false,
  title = 'Recent platform events',
}: {
  description?: string;
  events: PlatformEvent[];
  loading?: boolean;
  title?: string;
}): ReactNode {
  return (
    <SectionCard description={description} title={title}>
      {loading ? (
        <LoadingRows count={4} />
      ) : events.length === 0 ? (
        <EmptyState compact icon={Building2} title="No activity yet" />
      ) : (
        <ul className="divide-y">
          {events.map((event) => {
            const Icon = event.kind === 'billing' ? CreditCard : Building2;
            return (
              <li className="flex items-center gap-3 py-3" key={`${event.label}-${event.value}`}>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{event.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.value}</p>
                </div>
                <Badge variant={event.tone === 'success' ? 'success' : 'warning'}>{event.tone === 'success' ? 'OK' : 'Attention'}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
