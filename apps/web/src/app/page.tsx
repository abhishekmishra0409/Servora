import { PageShell } from '../components/page-shell';

export default function HomePage() {
  return (
    <PageShell
      eyebrow="Starter Monorepo"
      title="Restaurant operations that feel live, clear, and table-first."
      description="This starter includes the CMS, QR customer flow, waiter workspace, kitchen board, API contracts, and realtime foundations."
      toolbar={
        <>
          <a className="button-link" href="/dashboard">
            Open CMS
          </a>
          <a className="pill" href="/r/demo/main/t/demo-table">
            Preview customer route
          </a>
        </>
      }
    >
      <div className="card-grid">
        <article className="card">
          <h2>CMS</h2>
          <p className="muted">Dashboard, menu, tables, service requests, analytics, and billing.</p>
        </article>
        <article className="card">
          <h2>Customer PWA</h2>
          <p className="muted">QR entry, bucket collaboration, status tracking, service buzzer, and bill flow.</p>
        </article>
        <article className="card">
          <h2>Operational Apps</h2>
          <p className="muted">Dedicated waiter and kitchen surfaces for live branch operations.</p>
        </article>
      </div>
    </PageShell>
  );
}

