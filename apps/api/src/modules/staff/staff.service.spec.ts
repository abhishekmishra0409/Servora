import { ForbiddenException } from '@nestjs/common';
import { UserRole, type StaffJwtPayload } from '@restaurent/shared';

import { StaffService } from './staff.service';

const ownerPayload: StaffJwtPayload = {
  branchId: 'branch-1',
  email: 'owner@fixture.test',
  role: UserRole.Owner,
  sub: 'owner-user',
  tenantId: 'tenant-1',
  type: 'staff',
};

const superAdminPayload: StaffJwtPayload = {
  email: 'super@fixture.test',
  role: UserRole.SuperAdmin,
  sub: 'super-user',
  tenantId: 'tenant-1',
  type: 'staff',
};

const query = <T>(value: T): Record<string, jest.Mock> => ({
  exec: jest.fn().mockResolvedValue(value),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
});

const createService = (overrides?: {
  membershipModel?: Record<string, jest.Mock>;
  userModel?: Record<string, jest.Mock>;
}): { membershipModel: Record<string, jest.Mock>; service: StaffService; userModel: Record<string, jest.Mock> } => {
  const membershipModel = {
    countDocuments: jest.fn(() => query(0)),
    find: jest.fn(() => query([])),
    findById: jest.fn(() => query(null)),
    findByIdAndDelete: jest.fn(() => query(null)),
    findOneAndUpdate: jest.fn(),
    ...(overrides?.membershipModel ?? {}),
  };
  const userModel = {
    find: jest.fn(() => query([])),
    findById: jest.fn(() => query(null)),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    ...(overrides?.userModel ?? {}),
  };

  return {
    membershipModel,
    service: new StaffService(membershipModel as any, userModel as any, {} as any, {} as any),
    userModel,
  };
};

describe('StaffService', () => {
  it('filters platform roles out of branch staff lists for owners', async () => {
    const membershipQuery = query([
      {
        _id: 'membership-owner',
        branchId: 'branch-1',
        role: UserRole.Owner,
        tenantId: 'tenant-1',
        userId: 'owner-user',
      },
    ]);
    const userQuery = query([{ _id: 'owner-user', active: true, email: 'owner@fixture.test', name: 'Fixture Owner' }]);
    const { membershipModel, service, userModel } = createService({
      membershipModel: { find: jest.fn(() => membershipQuery) },
      userModel: { find: jest.fn(() => userQuery) },
    });

    await service.list('branch-1', 'tenant-1', ownerPayload);

    expect(membershipModel.find).toHaveBeenCalledWith({
      branchId: 'branch-1',
      role: { $nin: [UserRole.SuperAdmin, UserRole.PlatformAdmin] },
      tenantId: 'tenant-1',
    });
    expect(userModel.find).toHaveBeenCalledWith({ _id: { $in: ['owner-user'] } });
  });

  it('allows super admins to include platform roles in branch staff lists', async () => {
    const { membershipModel, service } = createService();

    await service.list('branch-1', 'tenant-1', superAdminPayload);

    expect(membershipModel.find).toHaveBeenCalledWith({
      branchId: 'branch-1',
      tenantId: 'tenant-1',
    });
  });

  it('prevents owners from updating platform memberships directly', async () => {
    const { service } = createService({
      membershipModel: {
        findById: jest.fn(() =>
          query({
            _id: 'membership-platform',
            branchId: 'branch-1',
            role: UserRole.PlatformAdmin,
            tenantId: 'tenant-1',
            userId: 'platform-user',
          }),
        ),
      },
    });

    await expect(service.update('membership-platform', { active: false }, ownerPayload)).rejects.toThrow(ForbiddenException);
  });

  it('prevents owners from deleting platform memberships directly', async () => {
    const deleteOne = jest.fn();
    const { service } = createService({
      membershipModel: {
        findById: jest.fn(() =>
          query({
            _id: 'membership-platform',
            branchId: 'branch-1',
            deleteOne,
            role: UserRole.PlatformAdmin,
            tenantId: 'tenant-1',
            userId: 'platform-user',
          }),
        ),
      },
    });

    await expect(service.delete('membership-platform', ownerPayload)).rejects.toThrow(ForbiddenException);
    expect(deleteOne).not.toHaveBeenCalled();
  });
});
