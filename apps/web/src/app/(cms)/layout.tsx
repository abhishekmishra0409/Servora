"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard',          icon: 'dashboard',           label: 'Dashboard'   },
  { href: '/orders',             icon: 'receipt_long',        label: 'Orders'      },
  { href: '/tables',             icon: 'table_restaurant',    label: 'Tables'      },
  { href: '/qr',                 icon: 'qr_code_2',           label: 'QR Codes'    },
  { href: '/menu/categories',    icon: 'category',            label: 'Categories'  },
  { href: '/menu/items',         icon: 'menu_book',           label: 'Menu Items'  },
  { href: '/menu/schedules',     icon: 'event_available',     label: 'Schedules'   },
  { href: '/service-requests',   icon: 'notifications_active',label: 'Requests'    },
  { href: '/analytics',          icon: 'monitoring',          label: 'Analytics'   },
  { href: '/staff',              icon: 'groups',              label: 'Staff'       },
  { href: '/subscription',       icon: 'workspace_premium',   label: 'Subscription'},
  { href: '/settings',           icon: 'settings',            label: 'Settings'    },
];

export default function CmsLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();

  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        {/* Brand */}
        <Link className="cms-sidebar__brand" href="/dashboard">
          <span className="material-symbols-outlined cms-sidebar__brand-icon" aria-hidden="true">
            restaurant
          </span>
          <div className="cms-sidebar__brand-text">
            <span>Restaurent</span>
            <small>Admin Portal</small>
          </div>
        </Link>

        {/* Navigation */}
        <nav aria-label="Admin navigation" className="cms-sidebar__nav">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={active ? 'active' : ''}
                href={link.href}
                key={link.href}
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined${active ? ' filled' : ''}`}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="cms-sidebar__footer">
          <span className="pill">
            <span aria-hidden="true" className="material-symbols-outlined">storefront</span>
            Harbor Grill
          </span>
          <div className="cms-sidebar__footer-links">
            <Link href="/login">Switch account</Link>
            <span style={{ color: 'var(--outline-variant)' }}>·</span>
            <Link href="/settings">Settings</Link>
          </div>
        </div>
      </aside>

      <div className="cms-content">{children}</div>
    </div>
  );
}
