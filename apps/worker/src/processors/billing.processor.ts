import type { Job } from 'bullmq';
import type { BillingReconcileJobPayload } from '@restaurent/shared';

import { collection } from '../db';

export const billingProcessor = async (job: Job): Promise<void> => {
  if (job.name === 'billing.reconcile_subscription') {
    const { payload, provider } = job.data as BillingReconcileJobPayload;
    const subscriptions = await collection('subscriptions');
    const providerSubscriptionId = String(payload.subscriptionId ?? payload.subscription_id ?? payload.id ?? 'unknown');
    const tenantId = String(payload.tenantId ?? payload.tenant_id ?? 'unknown');

    await subscriptions.updateOne(
      { provider, providerSubscriptionId },
      {
        $set: {
          planCode: String(payload.planCode ?? payload.plan_code ?? 'launch'),
          provider,
          providerCustomerId: String(payload.customerId ?? payload.customer_id ?? tenantId),
          providerSubscriptionId,
          status: String(payload.status ?? 'active'),
          tenantId,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    return;
  }

  throw new Error(`Unknown billing job: ${job.name}`);
};
