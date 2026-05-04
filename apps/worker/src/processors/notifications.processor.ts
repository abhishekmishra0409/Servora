import type { Job } from 'bullmq';
import type { NotificationJobPayload } from '@restaurent/shared';

import { collection } from '../db';

export const notificationsProcessor = async (job: Job): Promise<void> => {
  if (job.name.startsWith('notifications.')) {
    const attempts = await collection('notification_attempts');
    const payload = job.data as NotificationJobPayload;

    await attempts.insertOne({
      channel: 'internal',
      createdAt: new Date(),
      jobId: String(job.id ?? ''),
      name: job.name,
      payload,
      status: 'queued',
      tenantId: payload.tenantId,
    });
    return;
  }

  throw new Error(`Unknown notification job: ${job.name}`);
};
