import 'reflect-metadata';

import { Worker } from 'bullmq';

import { loadWorkspaceEnv } from './env-files';
import { createRedisConnection } from './queues/queue.factory';
import { QUEUE_NAMES } from './queues/queue-names';
import { analyticsProcessor } from './processors/analytics.processor';
import { billingProcessor } from './processors/billing.processor';
import { cleanupProcessor } from './processors/cleanup.processor';
import { mediaProcessor } from './processors/media.processor';
import { notificationsProcessor } from './processors/notifications.processor';
import { collection, connectWorkerDatabase, disconnectWorkerDatabase } from './db';

loadWorkspaceEnv();

const connection = createRedisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379');
let loggedRedisError = false;
connection.on('error', (error) => {
  if (loggedRedisError) {
    return;
  }

  loggedRedisError = true;
  console.warn(`[worker] redis connection unavailable: ${error.message}`);
});

const workers = [
  new Worker(QUEUE_NAMES.billing, billingProcessor, { connection }),
  new Worker(QUEUE_NAMES.analytics, analyticsProcessor, { connection }),
  new Worker(QUEUE_NAMES.cleanup, cleanupProcessor, { connection }),
  new Worker(QUEUE_NAMES.media, mediaProcessor, { connection }),
  new Worker(QUEUE_NAMES.notifications, notificationsProcessor, { connection }),
];

for (const worker of workers) {
  worker.on('completed', (job) => {
    console.log(`[worker] completed ${job.queueName}:${job.id}`);
  });
  worker.on('failed', (job, error) => {
    console.error(`[worker] failed ${job?.queueName}:${job?.id}`, error);
    void collection('dead_letter_jobs')
      .then((deadLetters) =>
        deadLetters.insertOne({
          attemptsMade: job?.attemptsMade ?? 0,
          data: job?.data ?? {},
          failedAt: new Date(),
          jobId: String(job?.id ?? ''),
          name: job?.name ?? 'unknown',
          queueName: job?.queueName ?? 'unknown',
          reason: error.message,
        }),
      )
      .catch((persistError) => console.error('[worker] could not persist dead letter', persistError));
  });
}

void connectWorkerDatabase()
  .then(() => console.log('[worker] database connected'))
  .catch((error) => console.error('[worker] database connection failed', error));
void connection
  .ping()
  .then(() => console.log('[worker] redis connected'))
  .catch((error) => console.warn(`[worker] redis ping failed: ${error instanceof Error ? error.message : String(error)}`));
console.log('[worker] queue processors started');
setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, 60_000).unref();

const shutdown = async (): Promise<void> => {
  await Promise.all(workers.map((worker) => worker.close()));
  connection.disconnect();
  await disconnectWorkerDatabase();
};

process.once('SIGTERM', () => void shutdown().then(() => process.exit(0)));
process.once('SIGINT', () => void shutdown().then(() => process.exit(0)));
