import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { clearSession } from '../lib/session';

const navItems = [
  { icon: 'qr_code_2',           label: 'Tables',   path: '/tables'          },
  { icon: 'receipt_long',        label: 'Orders',   path: '/pending-orders'  },
  { icon: 'notifications_active',label: 'Service',  path: '/service-queue'   },
  { icon: 'payments',            label: 'Bills',    path: '/bill-requests'   },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  function logout(): void {
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <div className="waiter-shell">
      <aside className="waiter-sidebar">
        <Link className="waiter-brand" to="/tables">
          <strong>Restaurent</strong>
          <span>Waiter Portal</span>
        </Link>

        <nav aria-label="Waiter navigation" className="waiter-nav">
          {navItems.map((item) => (
            <Link className={isActive(item.path) ? 'active' : ''} key={item.path} to={item.path}>
              <span className={`material-symbols-outlined${isActive(item.path) ? ' filled' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="waiter-content">
        <header className="waiter-topbar">
          <Link className="waiter-topbar__title" to="/tables">Restaurent</Link>
          <div className="waiter-topbar__actions">
            <button className="waiter-icon-button" type="button" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="waiter-logout-button" onClick={logout} title="Logout" type="button">
              <span className="material-symbols-outlined">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="waiter-main">{children}</main>
      </div>

      <nav aria-label="Waiter mobile navigation" className="waiter-bottom-nav">
        {navItems.map((item) => (
          <Link className={isActive(item.path) ? 'active' : ''} key={item.path} to={item.path}>
            <span className={`material-symbols-outlined${isActive(item.path) ? ' filled' : ''}`}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
