import type { ReactNode } from 'react';

export function StatePanel({
  title,
  description,
  tone,
}: {
  description: string;
  title: string;
  tone: 'loading' | 'empty' | 'error';
}): ReactNode {
  const heading = {
    empty: 'Empty state',
    error: 'Error state',
    loading: 'Loading state',
  }[tone];

  return (
    <section className="state-panel">
      <span className="pill">{heading}</span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </section>
  );
}

