import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { OrderStatus } from '@restaurent/shared';
import type { Connection } from 'mongoose';

import { getOrderCount, seedRestaurantFixture } from './helpers/fixtures';
import { postJson } from './helpers/http';
import { createTestApp, getBaseUrl } from './helpers/test-app';

describe('bucket submit workflow', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp(`restaurent_bucket_submit_${Date.now()}`);
    connection = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  it('clears the bucket after submit and allows another order in the same table session', async () => {
    const fixture = await seedRestaurantFixture(app);
    const baseUrl = getBaseUrl(app);

    const joinResult = await postJson<{
      guestToken: string;
      participantId: string;
      tableSessionId: string;
    }>(baseUrl, '/api/v1/table-sessions/join', {
      alias: 'Nina',
      qrToken: fixture.qrToken,
    });

    expect(joinResult.response.status).toBe(201);

    const guestHeaders = {
      authorization: `Bearer ${joinResult.data.guestToken}`,
    };

    const addItemResult = await postJson<{ bucket: { items: Array<{ menuItemId: string }> } }>(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/items`,
      {
        menuItemId: fixture.menuItemId,
        quantity: 2,
      },
      { headers: guestHeaders },
    );

    expect(addItemResult.response.status).toBe(201);

    const firstSubmit = await postJson<{ orderId: string; orderNo: string; status: OrderStatus }>(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/submit`,
      { paymentMethod: 'pay_later' },
      {
        headers: {
          ...guestHeaders,
          'Idempotency-Key': 'submit-once-a',
        },
      },
    );
    expect(firstSubmit.data.status).toBe(OrderStatus.Accepted);

    const emptySubmit = await postJson<{ message: string }>(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/submit`,
      { paymentMethod: 'pay_later' },
      {
        headers: {
          ...guestHeaders,
          'Idempotency-Key': 'submit-empty-bucket',
        },
      },
    );
    expect(emptySubmit.response.status).toBe(400);

    await postJson(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/items`,
      {
        menuItemId: fixture.menuItemId,
        quantity: 1,
      },
      { headers: guestHeaders },
    );

    const secondSubmit = await postJson<{ orderId: string; orderNo: string; status: OrderStatus }>(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/submit`,
      { paymentMethod: 'pay_later' },
      {
        headers: {
          ...guestHeaders,
          'Idempotency-Key': 'submit-once-b',
        },
      },
    );
    expect(secondSubmit.data.status).toBe(OrderStatus.Accepted);
    expect(secondSubmit.data.orderId).not.toBe(firstSubmit.data.orderId);
    expect(await getOrderCount(app)).toBe(2);
  });
});
