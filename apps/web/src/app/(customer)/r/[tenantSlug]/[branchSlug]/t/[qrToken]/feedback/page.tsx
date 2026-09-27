import { MessageSquareHeart } from 'lucide-react';
import Link from 'next/link';

import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

export default async function CustomerFeedbackPage({
  params,
}: {
  params: Promise<{ branchSlug: string; qrToken: string; tenantSlug: string }>;
}) {
  const resolvedParams = await params;
  const base = `/r/${resolvedParams.tenantSlug}/${resolvedParams.branchSlug}/t/${resolvedParams.qrToken}`;

  return (
    <CustomerPage>
      <CustomerHeading description="Tell the restaurant how your visit went." title="Feedback" />
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link href={`${base}/service`}>Send a note to the team</Link>
          </Button>
        }
        description="Ratings are not collected here yet. In the meantime you can send the floor team a message from the service screen."
        icon={MessageSquareHeart}
        title="Feedback is coming soon"
      />
    </CustomerPage>
  );
}
