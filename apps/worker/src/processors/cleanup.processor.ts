import type { Job } from 'bullmq';
import type { CleanupCloseTableSessionJobPayload } from '@restaurent/shared';
import { Types } from 'mongoose';

import { collection } from '../db';

export const cleanupProcessor = async (job: Job): Promise<void> => {
  if (job.name === 'cleanup.close_table_session') {
    const payload = job.data as CleanupCloseTableSessionJobPayload;
    const sessions = await collection('table_sessions');
    const orders = await collection('orders');

    if (payload.tableSessionId) {
      if (!Types.ObjectId.isValid(payload.tableSessionId)) {
        throw new Error(`Invalid tableSessionId: ${payload.tableSessionId}`);
      }
      const tableSessionObjectId = new Types.ObjectId(payload.tableSessionId);
      const hasOpenOrders = await orders.findOne({
        tableSessionId: tableSessionObjectId,
        status: { $nin: ['closed', 'rejected'] },
      });

      if (!hasOpenOrders) {
        await sessions.updateOne(
          { _id: tableSessionObjectId, status: 'active' },
          { $set: { closedAt: new Date(), status: 'closed', updatedAt: new Date() } },
        );
      }
      return;
    }

    const cutoff = new Date(Date.now() - (payload.olderThanMinutes ?? 360) * 60_000);
    await sessions.updateMany(
      { openedAt: { $lt: cutoff }, status: 'active', ...(payload.branchId ? { branchId: payload.branchId } : {}) },
      { $set: { closedAt: new Date(), status: 'closed', updatedAt: new Date() } },
    );
    return;
  }

  throw new Error(`Unknown cleanup job: ${job.name}`);
};
