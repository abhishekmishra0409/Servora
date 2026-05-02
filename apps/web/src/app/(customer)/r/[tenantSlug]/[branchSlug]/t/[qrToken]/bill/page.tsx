import { PageShell } from '@/components/page-shell';
import { StatePanel } from '@/components/state-panel';

export default function CustomerBillPage() {
  return (
    <PageShell
      eyebrow="Bill"
      title="Close the table with clarity."
      description="This route stages hosted payment handoff or cashier-assisted closure without exposing card handling inside the app itself."
    >
      <div className="state-row">
        <StatePanel tone="loading" title="Bill summary" description="Subtotal, tax, total, and payment pathway." />
        <StatePanel tone="empty" title="Settlement path" description="Support hosted online pay now and pay-later branch closure flows." />
      </div>
    </PageShell>
  );
}
