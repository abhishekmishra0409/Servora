import type { ReactNode } from 'react';

export function OperationalShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <>
      <header className="waiter-page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </>
  );
}
