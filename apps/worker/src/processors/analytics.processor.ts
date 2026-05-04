import type { AnalyticsRefreshBranchRollupJobPayload } from '@restaurent/shared';
import type { Job } from 'bullmq';

import { collection } from '../db';

export const analyticsProcessor = async (job: Job): Promise<void> => {
  if (job.name !== 'analytics.refresh_branch_rollup') {
    throw new Error(`Unknown analytics job: ${job.name}`);
  }

  const payload = job.data as AnalyticsRefreshBranchRollupJobPayload;
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const orders = await collection('orders');
  const rollups = await collection('branch_daily_rollups');
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const branchOrders = await orders
    .find({ branchId: payload.branchId, submittedAt: { $gte: start, $lt: end } })
    .toArray();
  const revenue = branchOrders.reduce((total, order) => total + Number(order.grandTotal ?? 0), 0);
  const orderCount = branchOrders.length;

  await rollups.updateOne(
    { branchId: payload.branchId, date, tenantId: payload.tenantId },
    {
      $set: {
        branchId: payload.branchId,
        date,
        orderCount,
        revenue: Number(revenue.toFixed(2)),
        tenantId: payload.tenantId,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
};

