import { BranchServiceMode, OrderStatus, TableStatus } from '@restaurent/shared';

import { SessionsService } from './sessions.service';

const execResult = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('SessionsService table status realtime events', () => {
  function createService(tableUpdateResult: unknown) {
    const qrCode = {
      _id: 'qr-1',
      branchId: 'branch-1',
      tableId: 'table-1',
      tenantId: 'tenant-1',
    };
    const session = {
      _id: 'session-1',
      branchId: 'branch-1',
      bucket: {
        items: [],
        state: 'open',
        totals: { grandTotal: 0, subtotal: 0, taxTotal: 0 },
        version: 0,
      },
      participants: [],
      tableId: 'table-1',
      tenantId: 'tenant-1',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const publishRealtimeEvent = jest.fn().mockResolvedValue(undefined);
    const tableModel = {
      findOneAndUpdate: jest.fn().mockReturnValue(execResult(tableUpdateResult)),
    };

    const service = new SessionsService(
      { findOne: jest.fn().mockReturnValue(execResult(qrCode)) } as never,
      { create: jest.fn(), findOne: jest.fn().mockReturnValue(execResult(session)) } as never,
      tableModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { signAsync: jest.fn().mockResolvedValue('guest-token') } as never,
      { getOrThrow: jest.fn().mockReturnValue('test-secret') } as never,
      {} as never,
      { assertTenantActive: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      { publishRealtimeEvent } as never,
    );

    return { publishRealtimeEvent, service, tableModel };
  }

  it('publishes table.status_changed when joining changes a free table to occupied', async () => {
    const { publishRealtimeEvent, service, tableModel } = createService({ _id: 'table-1' });

    await service.joinTableSession({ alias: 'Asha', qrToken: 'qr-token' });

    expect(tableModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'table-1', status: TableStatus.Free },
      { status: TableStatus.Occupied },
      { returnDocument: 'after' },
    );
    expect(publishRealtimeEvent).toHaveBeenCalledWith('branch:branch-1', 'table.status_changed', {
      status: TableStatus.Occupied,
      tableId: 'table-1',
    });
  });

  it('does not publish table.status_changed when joining leaves table status unchanged', async () => {
    const { publishRealtimeEvent, service } = createService(null);

    await service.joinTableSession({ alias: 'Dev', qrToken: 'qr-token' });

    expect(publishRealtimeEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      'table.status_changed',
      expect.any(Object),
    );
  });

  it('requires staff confirmation for waiter-confirmed and hybrid branches', () => {
    const { service } = createService(null);
    const initialOrderStatus = (service as unknown as {
      initialOrderStatus(serviceMode: BranchServiceMode): OrderStatus;
    }).initialOrderStatus.bind(service);

    expect(initialOrderStatus(BranchServiceMode.SelfService)).toBe(OrderStatus.Accepted);
    expect(initialOrderStatus(BranchServiceMode.WaiterConfirmed)).toBe(OrderStatus.PendingConfirmation);
    expect(initialOrderStatus(BranchServiceMode.Hybrid)).toBe(OrderStatus.PendingConfirmation);
  });
});
