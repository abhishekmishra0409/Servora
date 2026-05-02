import 'reflect-metadata';

import { Worker } from 'bullmq';

import { loadWorkspaceEnv } from './env-files';
import { createRedisConnection } from './queues/queue.factory';
import { QUEUE_NAMES } from './queues/queue-names';
import { billingProcessor } from './processors/billing.processor';
import { cleanupProcessor } from './processors/cleanup.processor';
import { mediaProcessor } from './processors/media.processor';
import { notificationsProcessor } from './processors/notifications.processor';

loadWorkspaceEnv();

const connection = createRedisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379');

const workers = [
  new Worker(QUEUE_NAMES.billing, billingProcessor, { connection }),
  new Worker(QUEUE_NAMES.cleanup, cleanupProcessor, { connection }),
  new Worker(QUEUE_NAMES.media, mediaProcessor, { connection }),
  new Worker(QUEUE_NAMES.notifications, notificationsProcessor, { connection }),
];

for (const worker of workers) {
  worker.on('completed', (job) => {
    console.log(`[worker] completed ${job.queueName}:${job.id}`);
  });
}

console.log('[worker] queue processors started');
