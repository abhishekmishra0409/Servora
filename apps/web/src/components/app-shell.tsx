'use client';

import { LogOut, Menu, Store, UserRoundCog } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { CmsSessionBranch } from '@/lib/api-client';
import type { AppNavLink } from '@/lib/role-access';
import { humanize } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  banner?: ReactNode;
  branchId: string;
  branches: CmsSessionBranch[];
  children: ReactNode;
  homeHref: string;
  isPlatformRole: boolean;
  links: AppNavLink[];
  onBranchChange: (branchId: string) => void;
  onLogout: () => void;
  role: string;
  switching: boolean;
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/super-admin') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ links, pathname }: { links: AppNavLink[]; pathname: string }): ReactNode {
  return (
    <nav aria-label="Workspace navigation" className="grid gap-0.5 px-3 py-3">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors',
              'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
            )}
            href={link.href}
            key={link.href}
          >
            <Icon className={cn('size-4.5 shrink-0', active ? 'text-sidebar-primary' : 'text-muted-foreground')} name={link.icon} />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  branchId,
  branches,
  isPlatformRole,
  onBranchChange,
  onLogout,
  switching,
}: Pick<AppShellProps, 'branchId' | 'branches' | 'isPlatformRole' | 'onBranchChange' | 'onLogout' | 'switching'>): ReactNode {
  const current = branches.find((branch) => branch.branchId === branchId);

  return (
    <div className="grid gap-3 border-t border-sidebar-border px-4 py-4">
      {isPlatformRole ? (
        <Button asChild size="sm">
          <Link href="/super-admin/tenants">Add new tenant</Link>
        </Button>
      ) : branches.length > 1 ? (
        <div className="grid gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Outlet</span>
          <Select disabled={switching} onValueChange={onBranchChange} value={branchId}>
            <SelectTrigger aria-label="Switch outlet" className="w-full bg-card" size="sm">
              <Store className="text-muted-foreground" />
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.branchId} value={branch.branchId}>
                  {branch.name} · {humanize(branch.roleKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
          <Store aria-hidden="true" className="size-4 text-muted-foreground" />
          <span className="truncate">{current?.name ?? 'Workspace'}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href="/login">
            <UserRoundCog />
            Switch account
          </Link>
        </Button>
        <Button onClick={onLogout} size="sm" type="button" variant="ghost">
          <LogOut />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AppShell({
  banner,
  branchId,
  branches,
  children,
  homeHref,
  isPlatformRole,
  links,
  onBranchChange,
  onLogout,
  role,
  switching,
}: AppShellProps): ReactNode {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const subtitle = isPlatformRole ? 'Platform console' : role ? `${humanize(role)} workspace` : 'Staff portal';
  const footer = (
    <SidebarFooter
      branchId={branchId}
      branches={branches}
      isPlatformRole={isPlatformRole}
      onBranchChange={onBranchChange}
      onLogout={onLogout}
      switching={switching}
    />
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border px-5 py-4">
          <BrandLogo href={homeHref} subtitle={subtitle} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav links={links} pathname={pathname} />
        </div>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <BrandLogo href={homeHref} size="sm" />
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" size="icon" type="button" variant="outline">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-[300px] flex-col gap-0 bg-sidebar p-0" side="left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="border-b border-sidebar-border px-5 py-4">
              <BrandLogo subtitle={subtitle} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav links={links} pathname={pathname} />
            </div>
            {footer}
          </SheetContent>
        </Sheet>
      </header>

      <div className="min-w-0">
        {banner}
        {children}
      </div>
    </div>
  );
}
