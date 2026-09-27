'use client';

import { LogOut, Menu, Plus, UserRoundCog } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { OutletSwitcher } from '@/components/outlet-switcher';
import { SidebarNav } from '@/components/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CmsSessionBranch } from '@/lib/api-client';
import { navGroupsFor, type AppNavLink } from '@/lib/role-access';
import { humanize } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  banner?: ReactNode;
  branchId: string;
  branches: CmsSessionBranch[];
  canManageOutlets: boolean;
  children: ReactNode;
  homeHref: string;
  isPlatformRole: boolean;
  links: AppNavLink[];
  onBranchChange: (branchId: string) => void;
  onLogout: () => void;
  /** Tenant's legal name, shown under the outlet in the switcher. */
  restaurantName?: string | undefined;
  role: string;
  switching: boolean;
}

function SidebarContext({
  branchId,
  branches,
  canManageOutlets,
  isPlatformRole,
  onBranchChange,
  restaurantName,
  switching,
}: Pick<AppShellProps, 'branchId' | 'branches' | 'canManageOutlets' | 'isPlatformRole' | 'onBranchChange' | 'restaurantName' | 'switching'>): ReactNode {
  if (isPlatformRole) {
    return (
      <Button asChild className="w-full" size="sm">
        <Link href="/super-admin/tenants">
          <Plus />
          Add new tenant
        </Link>
      </Button>
    );
  }

  return (
    <OutletSwitcher
      branchId={branchId}
      branches={branches}
      canManage={canManageOutlets}
      onChange={onBranchChange}
      restaurantName={restaurantName}
      switching={switching}
    />
  );
}

function AccountRow({ onLogout, role }: { onLogout: () => void; role: string }): ReactNode {
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3">
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
        {(humanize(role).slice(0, 1) || '?').toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
        Signed in as <span className="text-foreground">{humanize(role) || 'staff'}</span>
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Switch account" asChild size="icon-sm" variant="ghost">
            <Link href="/login">
              <UserRoundCog />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Switch account</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Log out" className="hover:text-destructive" onClick={onLogout} size="icon-sm" type="button" variant="ghost">
            <LogOut />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Log out</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function AppShell({
  banner,
  branchId,
  branches,
  canManageOutlets,
  children,
  homeHref,
  isPlatformRole,
  links,
  onBranchChange,
  onLogout,
  restaurantName,
  role,
  switching,
}: AppShellProps): ReactNode {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const subtitle = isPlatformRole ? 'Platform console' : role ? `${humanize(role)} workspace` : 'Staff portal';
  const context = (
    <SidebarContext
      branchId={branchId}
      branches={branches}
      canManageOutlets={canManageOutlets}
      isPlatformRole={isPlatformRole}
      onBranchChange={onBranchChange}
      restaurantName={restaurantName}
      switching={switching}
    />
  );

  const sidebarBody = (
    <>
      <div className="space-y-3 border-b border-sidebar-border px-3 pb-3 pt-5">
        <BrandLogo className="px-2.5" href={homeHref} subtitle={subtitle} />
        {context}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SidebarNav groups={navGroupsFor(role)} links={links} pathname={pathname} />
      </div>
      <AccountRow onLogout={onLogout} role={role} />
    </>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[272px_minmax(0,1fr)]">
      {switching ? (
        <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary/20">
          <div className="h-full w-1/3 animate-progress-indeterminate bg-primary" />
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar md:flex">{sidebarBody}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <BrandLogo href={homeHref} size="sm" />
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" size="icon" type="button" variant="outline">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-[300px] flex-col gap-0 bg-sidebar p-0" side="left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarBody}
          </SheetContent>
        </Sheet>
      </header>

      <div className={cn('min-w-0 transition-opacity', switching && 'pointer-events-none opacity-60')}>
        {banner}
        {children}
      </div>
    </div>
  );
}
