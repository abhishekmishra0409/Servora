import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Job } from 'bullmq';

vi.mock('../src/db', () => ({
  collection: vi.fn(),
}));

import { collection } from '../src/db';
import { analyticsProcessor } from '../src/processors/analytics.processor';
import { billingProcessor } from '../src/processors/billing.processor';
import { cleanupProcessor } from '../src/processors/cleanup.processor';
import { mediaProcessor } from '../src/processors/media.processor';
import { notificationsProcessor } from '../src/processors/notifications.processor';

const collectionMock = vi.mocked(collection);
const job = (name: string, data: unknown, id = 'job-1'): Job => ({ data, id, name }) as Job;

describe('worker processors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it('upserts subscription state for billing reconciliation jobs', async () => {
    const subscriptions = { updateOne: vi.fn().mockResolvedValue({}) };
    collectionMock.mockResolvedValue(subscriptions as never);

    await billingProcessor(
      job('billing.reconcile_subscription', {
        payload: { id: 'sub_123', status: 'active', tenantId: 'tenant-1' },
        provider: 'stripe',
      }),
    );

    expect(collectionMock).toHaveBeenCalledWith('subscriptions');
    expect(subscriptions.updateOne).toHaveBeenCalledWith(
      { provider: 'stripe', providerSubscriptionId: 'sub_123' },
      expect.objectContaining({
        $set: expect.objectContaining({ provider: 'stripe', status: 'active', tenantId: 'tenant-1' }),
      }),
      { upsert: true },
    );
  });

  it('persists notification attempts for notification jobs', async () => {
    const attempts = { insertOne: vi.fn().mockResolvedValue({}) };
    collectionMock.mockResolvedValue(attempts as never);

    await notificationsProcessor(
      job('notifications.order_created', { branchId: 'branch-1', orderId: 'order-1', tenantId: 'tenant-1' }),
    );

    expect(collectionMock).toHaveBeenCalledWith('notification_attempts');
    expect(attempts.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'internal',
        name: 'notifications.order_created',
        status: 'queued',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('records Cloudinary cleanup attempts with parsed public IDs', async () => {
    const attempts = { insertOne: vi.fn().mockResolvedValue({}) };
    collectionMock.mockResolvedValue(attempts as never);

    await mediaProcessor(
      job('media.cleanup_cloudinary_asset', {
        menuItemId: 'item-1',
        url: 'https://res.cloudinary.com/demo/image/upload/v123/restaurent/menu/dish.jpg',
      }),
    );

    expect(collectionMock).toHaveBeenCalledWith('media_cleanup_attempts');
    expect(attempts.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        menuItemId: 'item-1',
        publicId: 'restaurent/menu/dish',
        status: 'completed',
      }),
    );
  });

  it('closes a table session when no open orders remain', async () => {
    const orders = { findOne: vi.fn().mockResolvedValue(null) };
    const sessions = { updateOne: vi.fn().mockResolvedValue({}) };
    collectionMock.mockImplementation(async (name: string) => (name === 'table_sessions' ? sessions : orders) as never);

    await cleanupProcessor(
      job('cleanup.close_table_session', {
        tableSessionId: '64a7f0d0f0d0f0d0f0d0f0d0',
      }),
    );

    expect(orders.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $nin: ['closed', 'rejected'] },
      }),
    );
    expect(sessions.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'closed' }) }),
    );
  });

  it('writes daily branch analytics rollups', async () => {
    const orders = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ grandTotal: 120.25 }, { grandTotal: 80 }]),
      }),
    };
    const rollups = { updateOne: vi.fn().mockResolvedValue({}) };
    collectionMock.mockImplementation(async (name: string) => (name === 'orders' ? orders : rollups) as never);

    await analyticsProcessor(
      job('analytics.refresh_branch_rollup', {
        branchId: 'branch-1',
        date: '2026-05-03',
        tenantId: 'tenant-1',
      }),
    );

    expect(rollups.updateOne).toHaveBeenCalledWith(
      { branchId: 'branch-1', date: '2026-05-03', tenantId: 'tenant-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ orderCount: 2, revenue: 200.25 }),
      }),
      { upsert: true },
    );
  });
});
