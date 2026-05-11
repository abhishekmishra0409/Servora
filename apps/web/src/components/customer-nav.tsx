'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '.', icon: 'group', label: 'Join' },
  { href: 'menu', icon: 'restaurant_menu', label: 'Menu' },
  { href: 'bucket', icon: 'shopping_basket', label: 'Bucket' },
  { href: 'status', icon: 'assignment', label: 'Status' },
  { href: 'service', icon: 'concierge', label: 'Service' },
];

export function CustomerNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  function handleNavClick(): void {
    window.setTimeout(() => window.scrollTo(0, 0), 0);
  }

  return (
    <nav className="customer-bottom-nav" aria-label="Customer navigation">
      {navItems.map((item) => {
        const target = item.href === '.' ? basePath : `${basePath}/${item.href}`;
        const active = item.href === '.' ? pathname === basePath : pathname.startsWith(`${basePath}/${item.href}`);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={active ? 'active' : ''}
            href={target}
            key={item.label}
            onClick={handleNavClick}
            scroll
          >
            <span aria-hidden="true" className={active ? 'material-symbols-outlined filled' : 'material-symbols-outlined'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
