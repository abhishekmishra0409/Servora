import type { ReactNode } from 'react';

export function PageShell({
  title,
  eyebrow,
  description,
  toolbar,
  children,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  toolbar?: ReactNode;
}): ReactNode {
  return (
    <main>
      <div className="page-shell">
        <section className="hero">
          <span className="pill">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {toolbar ? <div className="toolbar">{toolbar}</div> : null}
        </section>
        {children}
      </div>
    </main>
  );
}

