import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';

import { QUEUE_NAMES, type QueueName } from './queue.constants';

type JobPayload = Record<string, unknown>;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection?: Redis;
  private readonly queues: Partial<Record<QueueName, Queue>> = {};
  private readonly disabled = process.env.NODE_ENV === 'test';
  private loggedConnectionError = false;

  constructor(configService: ConfigService) {
    if (this.disabled) {
      return;
    }

    const connection = new Redis(configService.get<string>('redis.url', 'redis://localhost:6379'), {
      connectTimeout: 1_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });
    connection.on('error', (error) => {
      if (this.loggedConnectionError) {
        return;
      }

      this.loggedConnectionError = true;
      this.logger.warn(`queue redis unavailable: ${error.message}`);
    });
    this.connection = connection;

    Object.assign(this.queues, Object.fromEntries(
      Object.values(QUEUE_NAMES).map((name) => [name, new Queue(name, { connection })]),
    ) as Record<QueueName, Queue>);
  }

  enqueueNotificationJob(name: string, payload: JobPayload, options?: JobsOptions): Promise<unknown> {
    return this.enqueue(QUEUE_NAMES.notifications, name, payload, options);
  }

  enqueueBillingJob(name: string, payload: JobPayload, options?: JobsOptions): Promise<unknown> {
    return this.enqueue(QUEUE_NAMES.billing, name, payload, options);
  }

  enqueueCleanupJob(name: string, payload: JobPayload, options?: JobsOptions): Promise<unknown> {
    return this.enqueue(QUEUE_NAMES.cleanup, name, payload, options);
  }

  enqueueMediaJob(name: string, payload: JobPayload, options?: JobsOptions): Promise<unknown> {
    return this.enqueue(QUEUE_NAMES.media, name, payload, options);
  }

  enqueueAnalyticsJob(name: string, payload: JobPayload, options?: JobsOptions): Promise<unknown> {
    return this.enqueue(QUEUE_NAMES.analytics, name, payload, options);
  }

  async ping(): Promise<boolean> {
    if (this.disabled) {
      return true;
    }
    if (!this.connection) {
      return false;
    }
    return (await this.connection.ping()) === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(Object.values(this.queues).map((queue) => queue.close()));
    this.connection?.disconnect();
  }

  private async enqueue(
    queueName: QueueName,
    name: string,
    payload: JobPayload,
    options: JobsOptions = {},
  ): Promise<unknown> {
    const queue = this.queues[queueName];
    if (!queue) {
      return undefined;
    }

    try {
      const job = await queue.add(name, payload, {
        attempts: 3,
        backoff: { delay: 5_000, type: 'exponential' },
        removeOnComplete: 100,
        removeOnFail: 250,
        ...options,
      });
      this.logger.debug(`queued ${queueName}:${name}:${job.id}`);
      return job;
    } catch (error) {
      this.logger.warn(`queue unavailable for ${queueName}:${name}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
}
