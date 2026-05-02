import type { Job } from 'bullmq';

export const notificationsProcessor = async (job: Job): Promise<void> => {
  console.log('[notifications.processor]', job.name, job.data);
};

