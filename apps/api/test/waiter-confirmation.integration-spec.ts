import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { BranchServiceMode, OrderStatus, UserRole } from '@restaurent/shared';
import type { Connection } from 'mongoose';

import { seedRestaurantFixture } from './helpers/fixtures';
import { postJson } from './helpers/http';
import { cleanupTestDatabase, createTestApp, getBaseUrl } from './helpers/test-app';

describe('waiter confirmation flow', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp(`restaurent_waiter_confirm_${Date.now()}`);
    connection = app.get<Connection>(getConnectionToken());
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

  it('starts orders as pending_confirmation and lets staff confirm them', async () => {
    const fixture = await seedRestaurantFixture(app, {
      ownerEmail: 'owner.waiter@fixture.test',
      serviceMode: BranchServiceMode.WaiterConfirmed,
    });
    const baseUrl = getBaseUrl(app);

    const joinResult = await postJson<{
      guestToken: string;
      tableSessionId: string;
    }>(baseUrl, '/api/v1/table-sessions/join', {
      alias: 'Arjun',
      qrToken: fixture.qrToken,
    });

    const guestHeaders = {
      authorization: `Bearer ${joinResult.data.guestToken}`,
    };

    await postJson(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/items`,
      {
        menuItemId: fixture.menuItemId,
        quantity: 1,
      },
      { headers: guestHeaders },
    );

    const submitResult = await postJson<{ orderId: string; status: OrderStatus }>(
      baseUrl,
      `/api/v1/buckets/${joinResult.data.tableSessionId}/submit`,
      { paymentMethod: 'pay_later' },
      {
        headers: {
          ...guestHeaders,
          'Idempotency-Key': 'waiter-confirmation-submit',
        },
      },
    );

    expect(submitResult.data.status).toBe(OrderStatus.PendingConfirmation);

    const loginResult = await postJson<{
      accessToken: string;
      role: UserRole;
      userId: string;
    }>(baseUrl, '/api/v1/auth/login', {
      email: fixture.ownerEmail,
      password: fixture.ownerPassword,
    });

    expect(loginResult.data.role).toBe(UserRole.Owner);

    const confirmResult = await postJson<{ confirmedByUserId: string; status: OrderStatus }>(
      baseUrl,
      `/api/v1/orders/${submitResult.data.orderId}/confirm`,
      {},
      {
        headers: {
          authorization: `Bearer ${loginResult.data.accessToken}`,
        },
      },
    );

    expect(confirmResult.data.status).toBe(OrderStatus.Accepted);
    expect(confirmResult.data.confirmedByUserId).toBe(loginResult.data.userId);
  });
});
