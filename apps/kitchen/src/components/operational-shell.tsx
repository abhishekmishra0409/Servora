import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { href: '/board', label: 'Dashboard', icon: '▣' },
  { href: '/ticket-detail', label: 'Orders', icon: '▤' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function OperationalShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  const location = useLocation();

  return (
    <div className="kitchen-shell">
      <aside className="kitchen-sidebar">
        <div className="kitchen-sidebar__brand">
          <span>Restaurent</span>
          <small>Kitchen Display</small>
        </div>

        <nav aria-label="Kitchen navigation" className="kitchen-sidebar__nav">
          {links.map((link) => {
            const active = location.pathname === link.href || location.pathname.startsWith(`${link.href}/`);

            return (
              <Link className={active ? 'active' : ''} key={link.href} to={link.href}>
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link className="kitchen-sidebar__settings" to="/settings">
          <span aria-hidden="true">⚙</span>
          Settings
        </Link>
      </aside>

      <section className="kitchen-main">
        <header className="kitchen-topbar">
          <div>
            <p className="eyebrow">Kitchen display</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <div className="kitchen-topbar__status">LIVE</div>
        </header>
        {children}
      </section>
    </div>
  );
}

