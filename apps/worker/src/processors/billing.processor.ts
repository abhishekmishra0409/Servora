import type { Job } from 'bullmq';

export const billingProcessor = async (job: Job): Promise<void> => {
  console.log('[billing.processor]', job.name, job.data);
};

