import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

import { createTestApp, getBaseUrl } from './helpers/test-app';
import { seedRestaurantFixture } from './helpers/fixtures';

describe('public table context', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp(`restaurent_public_context_${Date.now()}`);
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

  it('resolves QR token into public table context', async () => {
    const fixture = await seedRestaurantFixture(app, { qrToken: 'qr-public-context' });
    const baseUrl = getBaseUrl(app);

    const response = await fetch(`${baseUrl}/api/v1/public/table-context?qrToken=qr-public-context`);
    const body = (await response.json()) as {
      branch: { id: string; name: string };
      table: { id: string; tableNo: string };
      tableSession: unknown | null;
      tenant: { id: string; legalName: string };
    };

    expect(response.ok).toBe(true);
    expect(body.tenant.id).toBe(fixture.tenantId);
    expect(body.branch.id).toBe(fixture.branchId);
    expect(body.table.id).toBe(fixture.tableId);
    expect(body.table.tableNo).toBe('T1');
    expect(body.tableSession).toBeNull();
  });
});
