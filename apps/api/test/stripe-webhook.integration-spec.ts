import type { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';

import { IdempotencyKey } from '../src/database/schemas/idempotency-key.schema';
import { seedRestaurantFixture } from './helpers/fixtures';
import { cleanupTestDatabase, createTestApp, getBaseUrl } from './helpers/test-app';

describe('stripe webhook dedupe', () => {
  let app: INestApplication;
  let connection: Connection;
  let idempotencyModel: Model<IdempotencyKey>;

  beforeAll(async () => {
    app = await createTestApp(`restaurent_stripe_webhook_${Date.now()}`);
    connection = app.get<Connection>(getConnectionToken());
    idempotencyModel = app.get<Model<IdempotencyKey>>(getModelToken(IdempotencyKey.name));
  });

  afterAll(async () => {
    if (connection) {
      await cleanupTestDatabase(app);
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  it('accepts duplicate webhook deliveries without persisting twice', async () => {
    const baseUrl = getBaseUrl(app);
    const fixture = await seedRestaurantFixture(app, {
      tenantSlug: 'webhook-fixture',
    });
    const payload = {
      customerId: 'cus_fixture',
      id: 'evt_fixture_1',
      status: 'active',
      subscriptionId: 'sub_fixture_1',
      tenantId: fixture.tenantId,
    };

    const firstResponse = await fetch(`${baseUrl}/api/v1/webhooks/stripe`, {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const firstBody = (await firstResponse.json()) as { accepted: boolean; duplicate: boolean };

    const secondResponse = await fetch(`${baseUrl}/api/v1/webhooks/stripe`, {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const secondBody = (await secondResponse.json()) as { accepted: boolean; duplicate: boolean };

    expect(firstBody).toEqual({ accepted: true, duplicate: false });
    expect(secondBody).toEqual({ accepted: true, duplicate: true });
    expect(await idempotencyModel.countDocuments({ route: 'webhook:stripe' }).exec()).toBe(1);
  });
});
