import type { Job } from 'bullmq';

export const mediaProcessor = async (job: Job): Promise<void> => {
  console.log('[media.processor]', job.name, job.data);
};

