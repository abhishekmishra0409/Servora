'use client';

import type { ReactNode } from 'react';

import { NoticeBanner } from '@/components/error-state';

import { usePlatformConsole } from './platform-console';
import { PlatformPage } from './platform-page';
import { RecentEvents } from './recent-events';

export function AuditLogView(): ReactNode {
  const console = usePlatformConsole();
  const { recentEvents, state } = console;

  return (
    <PlatformPage
      description="Administrative changes, tenant events, and platform access activity."
      onRefresh={() => void console.load()}
      refreshing={console.busy}
      state={state}
      title="Audit log"
    >
      <NoticeBanner tone="info">
        Platform-wide audit storage is not wired up yet. The events below are derived from current tenant and subscription
        records. Each tenant&rsquo;s own activity log is available from its detail page.
      </NoticeBanner>
      <RecentEvents events={recentEvents} loading={state.status === 'loading'} title="Derived events" />
    </PlatformPage>
  );
}
