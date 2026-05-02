import type { Job } from 'bullmq';

export const cleanupProcessor = async (job: Job): Promise<void> => {
  console.log('[cleanup.processor]', job.name, job.data);
};

