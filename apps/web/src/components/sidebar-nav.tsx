'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icon';
import { groupNavLinks, type AppNavLink, type NavGroup } from '@/lib/role-access';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'servora:sidebar:collapsed';

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(collapsed: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Private mode or blocked storage: the sidebar still works, it just forgets.
  }
}

export function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/super-admin') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The workspace navigation, grouped into categories. Each category can be
 * collapsed; the choice is remembered on this device, and navigating into a
 * collapsed category opens it again so the current page is always visible.
 */
export function SidebarNav({
  groups,
  links,
  pathname,
}: {
  groups: NavGroup[];
  links: AppNavLink[];
  pathname: string;
}): ReactNode {
  const sections = useMemo(() => groupNavLinks(links, groups), [groups, links]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  // Storage is read after mount so the first render matches the server.
  useEffect(() => {
    setCollapsed(readCollapsed());
    setReady(true);
  }, []);

  const activeSection = sections.find((section) => section.links.some((link) => isActiveHref(pathname, link.href)))?.key;

  useEffect(() => {
    if (!activeSection) return;
    setCollapsed((current) => {
      if (!current.has(activeSection)) return current;
      const next = new Set(current);
      next.delete(activeSection);
      writeCollapsed(next);
      return next;
    });
  }, [activeSection]);

  function toggle(key: string): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writeCollapsed(next);
      return next;
    });
  }

  return (
    <nav aria-label="Workspace navigation" className="px-3 py-3">
      <ul className="grid gap-3">
        {sections.map((section) => {
          const open = !collapsed.has(section.key);
          const panelId = `nav-section-${section.key}`;
          return (
            <li key={section.key}>
              <button
                aria-controls={panelId}
                aria-expanded={open}
                className={cn(
                  'group flex h-7 w-full items-center gap-2 rounded-md px-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/90 transition-colors',
                  'hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                )}
                onClick={() => toggle(section.key)}
                type="button"
              >
                <span className="flex-1 truncate">{section.label}</span>
                {!open ? (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium normal-case tracking-normal tabular-nums">
                    {section.links.length}
                  </span>
                ) : null}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-hover:opacity-100',
                    !open && '-rotate-90',
                  )}
                />
              </button>

              <div
                className={cn(
                  'grid',
                  // Animate only after the stored state is applied, so reloads don't flicker.
                  ready && 'transition-[grid-template-rows] duration-200 ease-out',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
                id={panelId}
                inert={!open}
              >
                <ul className="grid gap-0.5 overflow-hidden pt-0.5">
                  {section.links.map((link) => {
                    const active = isActiveHref(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'relative flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors',
                            'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                            active && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
                          )}
                          href={link.href}
                        >
                          {active ? (
                            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary" />
                          ) : null}
                          <Icon
                            className={cn('size-4.5 shrink-0', active ? 'text-sidebar-primary' : 'text-muted-foreground')}
                            name={link.icon}
                          />
                          <span className="truncate">{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
