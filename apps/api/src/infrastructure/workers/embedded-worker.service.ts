import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type {
  AnalyticsRefreshBranchRollupJobPayload,
  BillingReconcileJobPayload,
  MediaCleanupJobPayload,
  NotificationJobPayload,
  CleanupCloseTableSessionJobPayload,
} from '@restaurent/shared';
import { Worker, type Job } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import Redis from 'ioredis';
import { Connection, Types } from 'mongoose';

import { QUEUE_NAMES } from '../queue/queue.constants';

type CollectionGetter = (name: string) => ReturnType<Connection['collection']>;

const createRedisConnection = (url: string): Redis =>
  new Redis(url, {
    connectTimeout: 1_000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

const publicIdFromUrl = (url: string): string => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const uploadIndex = parts.indexOf('upload');
  const assetParts = uploadIndex >= 0 ? parts.slice(uploadIndex + 1) : parts;
  const withoutVersion = assetParts[0]?.startsWith('v') ? assetParts.slice(1) : assetParts;
  const joined = withoutVersion.join('/');
  return joined.replace(/\.[a-zA-Z0-9]+$/, '');
};

@Injectable()
export class EmbeddedWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmbeddedWorkerService.name);
  private readonly workers: Worker[] = [];
  private redis?: Redis;
  private loggedRedisError = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.EMBEDDED_WORKERS !== 'true' || process.env.NODE_ENV === 'test') {
      return;
    }

    this.redis = createRedisConnection(this.configService.get<string>('redis.url', 'redis://localhost:6379'));
    this.redis.on('error', (error) => {
      if (this.loggedRedisError) {
        return;
      }

      this.loggedRedisError = true;
      this.logger.warn(`embedded worker redis unavailable: ${error.message}`);
    });

    try {
      await this.redis.connect();
    } catch (error) {
      this.logger.warn(`embedded worker redis unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const collection = (name: string) => this.connection.collection(name);
    this.workers.push(
      new Worker(QUEUE_NAMES.billing, this.billingProcessor(collection), { connection: this.redis }),
      new Worker(QUEUE_NAMES.analytics, this.analyticsProcessor(collection), { connection: this.redis }),
      new Worker(QUEUE_NAMES.cleanup, this.cleanupProcessor(collection), { connection: this.redis }),
      new Worker(QUEUE_NAMES.media, this.mediaProcessor(collection), { connection: this.redis }),
      new Worker(QUEUE_NAMES.notifications, this.notificationsProcessor(collection), { connection: this.redis }),
    );

    for (const worker of this.workers) {
      worker.on('completed', (job) => {
        this.logger.debug(`completed ${job.queueName}:${job.id}`);
      });
      worker.on('failed', (job, error) => {
        this.logger.error(`failed ${job?.queueName}:${job?.id}`, error.stack);
        void collection('dead_letter_jobs')
          .insertOne({
            attemptsMade: job?.attemptsMade ?? 0,
            data: job?.data ?? {},
            failedAt: new Date(),
            jobId: String(job?.id ?? ''),
            name: job?.name ?? 'unknown',
            queueName: job?.queueName ?? 'unknown',
            reason: error.message,
          })
          .catch((persistError: unknown) =>
            this.logger.error(
              `could not persist dead letter: ${persistError instanceof Error ? persistError.message : String(persistError)}`,
            ),
          );
      });
    }

    this.logger.log('embedded queue processors started');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.redis?.disconnect();
  }

  private notificationsProcessor(collection: CollectionGetter) {
    return async (job: Job): Promise<void> => {
      if (job.name.startsWith('notifications.')) {
        const attempts = collection('notification_attempts');
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
  }

  private billingProcessor(collection: CollectionGetter) {
    return async (job: Job): Promise<void> => {
      if (job.name === 'billing.reconcile_subscription') {
        const { payload, provider } = job.data as BillingReconcileJobPayload;
        const subscriptions = collection('subscriptions');
        const providerSubscriptionId = String(payload.subscriptionId ?? payload.subscription_id ?? payload.id ?? 'unknown');
        const tenantId = String(payload.tenantId ?? payload.tenant_id ?? 'unknown');

        await subscriptions.updateOne(
          { provider, providerSubscriptionId },
          {
            $set: {
              planCode: String(payload.planCode ?? payload.plan_code ?? 'launch'),
              provider,
              providerCustomerId: String(payload.customerId ?? payload.customer_id ?? tenantId),
              providerSubscriptionId,
              status: String(payload.status ?? 'active'),
              tenantId,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
        return;
      }

      throw new Error(`Unknown billing job: ${job.name}`);
    };
  }

  private cleanupProcessor(collection: CollectionGetter) {
    return async (job: Job): Promise<void> => {
      if (job.name === 'cleanup.close_table_session') {
        const payload = job.data as CleanupCloseTableSessionJobPayload;
        const sessions = collection('table_sessions');
        const orders = collection('orders');

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
  }

  private mediaProcessor(collection: CollectionGetter) {
    return async (job: Job): Promise<void> => {
      if (job.name === 'media.cleanup_cloudinary_asset') {
        const payload = job.data as MediaCleanupJobPayload;
        const mediaJobs = collection('media_cleanup_attempts');
        const publicId = publicIdFromUrl(payload.url);

        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          cloudinary.config({
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          });
          await cloudinary.uploader.destroy(publicId, { invalidate: true });
        }

        await mediaJobs.insertOne({
          createdAt: new Date(),
          menuItemId: payload.menuItemId,
          publicId,
          status: 'completed',
          url: payload.url,
        });
        return;
      }

      throw new Error(`Unknown media job: ${job.name}`);
    };
  }

  private analyticsProcessor(collection: CollectionGetter) {
    return async (job: Job): Promise<void> => {
      if (job.name !== 'analytics.refresh_branch_rollup') {
        throw new Error(`Unknown analytics job: ${job.name}`);
      }

      const payload = job.data as AnalyticsRefreshBranchRollupJobPayload;
      const date = payload.date ?? new Date().toISOString().slice(0, 10);
      const orders = collection('orders');
      const rollups = collection('branch_daily_rollups');
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      const branchOrders = await orders
        .find({ branchId: payload.branchId, submittedAt: { $gte: start, $lt: end } })
        .toArray();
      const revenue = branchOrders.reduce((total: number, order) => total + Number((order as { grandTotal?: unknown }).grandTotal ?? 0), 0);
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
  }
}
