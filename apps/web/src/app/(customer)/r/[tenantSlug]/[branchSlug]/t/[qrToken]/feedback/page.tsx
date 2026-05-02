import { PageShell } from '@/components/page-shell';
import { StatePanel } from '@/components/state-panel';

export default function CustomerFeedbackPage() {
  return (
    <PageShell
      eyebrow="Feedback"
      title="Catch the post-meal signal while it is fresh."
      description="A future-ready feedback page closes the dine-in loop without changing the operational order model."
    >
      <div className="state-row">
        <StatePanel tone="loading" title="Rating capture" description="Lightweight feedback and follow-up intent." />
        <StatePanel tone="empty" title="Loyalty hook" description="Reserve room for future account history and favorites." />
      </div>
    </PageShell>
  );
}
