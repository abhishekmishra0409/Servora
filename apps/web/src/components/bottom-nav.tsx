'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icon';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '.', icon: 'group', label: 'Join' },
  { href: 'menu', icon: 'restaurant_menu', label: 'Menu' },
  { href: 'bucket', icon: 'shopping_basket', label: 'Bucket' },
  { href: 'status', icon: 'assignment', label: 'Status' },
  { href: 'service', icon: 'concierge', label: 'Service' },
];

/** Height of the bar excluding the safe-area inset; `CustomerPage` pads for it. */
export const BOTTOM_NAV_HEIGHT = '4rem';

export function BottomNav({ basePath }: { basePath: string }): ReactNode {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Guest navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur md:inset-x-auto md:left-1/2 md:w-[560px] md:-translate-x-1/2 md:rounded-t-2xl md:border-x"
    >
      <ul className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const target = item.href === '.' ? basePath : `${basePath}/${item.href}`;
          const active = item.href === '.' ? pathname === basePath : pathname.startsWith(`${basePath}/${item.href}`);
          return (
            <li key={item.label}>
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                  active && 'text-primary',
                )}
                href={target}
                onClick={() => window.setTimeout(() => window.scrollTo(0, 0), 0)}
              >
                <span className={cn('inline-flex h-7 w-11 items-center justify-center rounded-full transition-colors', active && 'bg-accent')}>
                  <Icon className="size-5" name={item.icon} strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
