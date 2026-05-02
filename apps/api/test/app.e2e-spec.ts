import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

import { createTestApp, getBaseUrl } from './helpers/test-app';

describe('app bootstrap', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp(`restaurent_api_e2e_${Date.now()}`);
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

  it('serves health and readiness endpoints', async () => {
    const baseUrl = getBaseUrl(app);

    const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
    const healthBody = (await healthResponse.json()) as { status: string; timestamp: string };

    expect(healthResponse.ok).toBe(true);
    expect(healthBody.status).toBe('ok');
    expect(new Date(healthBody.timestamp).toString()).not.toBe('Invalid Date');

    const readyResponse = await fetch(`${baseUrl}/api/v1/ready`);
    const readyBody = (await readyResponse.json()) as { ready: boolean };

    expect(readyResponse.ok).toBe(true);
    expect(readyBody.ready).toBe(true);
  });
});
