import type { INestApplication } from '@nestjs/common';
import { BranchServiceMode, TableStatus, UserRole, slugify } from '@restaurent/shared';
import type { Model } from 'mongoose';

import { hashValue } from '../../src/common/utils/hash';
import { makeId } from '../../src/common/utils/id';
import { Branch } from '../../src/database/schemas/branch.schema';
import { Counter } from '../../src/database/schemas/counter.schema';
import { Membership } from '../../src/database/schemas/membership.schema';
import { MenuCategory } from '../../src/database/schemas/menu-category.schema';
import { MenuItem } from '../../src/database/schemas/menu-item.schema';
import { Order } from '../../src/database/schemas/order.schema';
import { QrCode } from '../../src/database/schemas/qr-code.schema';
import { Floor } from '../../src/database/schemas/floor.schema';
import { RestaurantTable } from '../../src/database/schemas/table.schema';
import { Tenant } from '../../src/database/schemas/tenant.schema';
import { TableSession } from '../../src/database/schemas/table-session.schema';
import { User } from '../../src/database/schemas/user.schema';
import { getModel } from './test-app';

export interface SeededContext {
  branchId: string;
  categoryId: string;
  menuItemId: string;
  ownerEmail: string;
  ownerPassword: string;
  qrToken: string;
  tableId: string;
  tenantId: string;
}

const getTypedModel = <T>(app: INestApplication, modelClass: { name: string }): Model<T> =>
  getModel<T>(app, modelClass);

export const seedRestaurantFixture = async (
  app: INestApplication,
  options?: {
    branchSlug?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    qrToken?: string;
    serviceMode?: BranchServiceMode;
    tenantSlug?: string;
  },
): Promise<SeededContext> => {
  const TenantModel = getTypedModel<Tenant>(app, Tenant);
  const BranchModel = getTypedModel<Branch>(app, Branch);
  const UserModel = getTypedModel<User>(app, User);
  const MembershipModel = getTypedModel<Membership>(app, Membership);
  const MenuCategoryModel = getTypedModel<MenuCategory>(app, MenuCategory);
  const MenuItemModel = getTypedModel<MenuItem>(app, MenuItem);
  const FloorModel = getTypedModel<Floor>(app, Floor);
  const TableModel = getTypedModel<RestaurantTable>(app, RestaurantTable);
  const QrCodeModel = getTypedModel<QrCode>(app, QrCode);
  const CounterModel = getTypedModel<Counter>(app, Counter);

  const qrToken = options?.qrToken ?? `qr-${makeId('table')}`;

  const tenant = await TenantModel.create({
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    legalName: 'Fixture Hospitality LLP',
    slug: options?.tenantSlug ?? `fixture-${makeId('tenant')}`,
    status: 'active',
  });

  const branch = await BranchModel.create({
    address: { city: 'Bengaluru', line1: '42 Market Road' },
    hours: { weekdays: '11:00-23:00' },
    name: 'Main Branch',
    serviceMode: options?.serviceMode ?? BranchServiceMode.SelfService,
    slug: options?.branchSlug ?? `branch-${makeId('branch')}`,
    tenantId: String(tenant._id),
  });

  const ownerPassword = options?.ownerPassword ?? 'OwnerPass123!';
  const owner = await UserModel.create({
    active: true,
    email: (options?.ownerEmail ?? `owner-${makeId('user')}@fixture.test`).toLowerCase(),
    name: 'Fixture Owner',
    passwordHash: await hashValue(ownerPassword),
  });

  await MembershipModel.create({
    branchId: String(branch._id),
    role: UserRole.Owner,
    tenantId: String(tenant._id),
    userId: String(owner._id),
  });

  const category = await MenuCategoryModel.create({
    branchId: String(branch._id),
    name: 'Signature Plates',
    sortOrder: 1,
    subcategories: [],
    tenantId: String(tenant._id),
    visible: true,
  });

  const dishName = 'Fixture Paneer Steak';
  const menuItem = await MenuItemModel.create({
    addonGroups: [
      {
        id: makeId('addon'),
        label: 'Extras',
        maxSelections: 2,
        minSelections: 0,
        options: [{ id: makeId('option'), label: 'Garlic Butter', priceDelta: 30 }],
      },
    ],
    allergens: ['dairy'],
    available: true,
    branchId: String(branch._id),
    branchOverrides: [],
    categoryId: String(category._id),
    description: 'Fixture dish for integration tests.',
    dietaryFlags: ['chef_favorite'],
    name: dishName,
    price: 320,
    schedules: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], endTime: '23:00', startTime: '11:00' }],
    slug: slugify(dishName),
    tenantId: String(tenant._id),
    variants: [{ id: makeId('variant'), label: 'Large', priceDelta: 80 }],
  });

  const floor = await FloorModel.create({
    branchId: String(branch._id),
    name: 'Main Hall',
    sortOrder: 1,
    tenantId: String(tenant._id),
  });

  const table = await TableModel.create({
    branchId: String(branch._id),
    capacity: 4,
    floorId: String(floor._id),
    status: TableStatus.Free,
    tableNo: 'T1',
    tenantId: String(tenant._id),
  });

  await QrCodeModel.create({
    branchId: String(branch._id),
    tableId: String(table._id),
    tenantId: String(tenant._id),
    token: qrToken,
    version: 1,
  });

  await CounterModel.create({
    branchId: String(branch._id),
    name: 'order',
    tenantId: String(tenant._id),
    value: 0,
  });

  return {
    branchId: String(branch._id),
    categoryId: String(category._id),
    menuItemId: String(menuItem._id),
    ownerEmail: owner.email,
    ownerPassword,
    qrToken,
    tableId: String(table._id),
    tenantId: String(tenant._id),
  };
};

export const getOrderCount = async (app: INestApplication): Promise<number> => {
  const OrderModel = getTypedModel<Order>(app, Order);
  return OrderModel.countDocuments().exec();
};

export const getTableSessionCount = async (app: INestApplication): Promise<number> => {
  const TableSessionModel = getTypedModel<TableSession>(app, TableSession);
  return TableSessionModel.countDocuments().exec();
};
