/// <reference types="node" />
import {
  BranchServiceMode,
  OrderStatus,
  ServiceRequestStatus,
  TableStatus,
  UserRole,
  slugify,
} from '@restaurent/shared';

import { hashValue } from '../apps/api/src/common/utils/hash';
import { makeId } from '../apps/api/src/common/utils/id';
import { connectToDatabase, disconnectFromDatabase, registerModels } from './_db';

async function seed(): Promise<void> {
  await connectToDatabase();
  const models = registerModels();

  const User = models.User!;
  const Tenant = models.Tenant!;
  const Branch = models.Branch!;
  const Membership = models.Membership!;
  const SubscriptionPlan = models.SubscriptionPlan!;
  const Subscription = models.Subscription!;
  const MenuCategory = models.MenuCategory!;
  const MenuItem = models.MenuItem!;
  const Floor = models.Floor!;
  const RestaurantTable = models.RestaurantTable!;
  const QrCode = models.QrCode!;
  const TableSession = models.TableSession!;
  const Order = models.Order!;
  const ServiceRequest = models.ServiceRequest!;

  const platformAdmin = await User.findOneAndUpdate(
    { email: process.env.SEED_ADMIN_EMAIL ?? 'platform@example.com' },
    {
      $set: {
        active: true,
        name: 'Platform Admin',
        passwordHash: await hashValue(process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const tenant = await Tenant.findOneAndUpdate(
    { slug: 'harbor-grill' },
    {
      $set: {
        defaultCurrency: 'INR',
        defaultTimezone: 'Asia/Kolkata',
        legalName: 'Harbor Grill Hospitality LLP',
        status: 'active',
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const branch = await Branch.findOneAndUpdate(
    { slug: 'downtown', tenantId: String(tenant._id) },
    {
      $set: {
        address: { city: 'Bengaluru', line1: '42 Market Road' },
        hours: { weekdays: '11:00-23:00' },
        name: 'Downtown',
        serviceMode: BranchServiceMode.Hybrid,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const owner = await User.findOneAndUpdate(
    { email: 'owner@harborgrill.test' },
    {
      $set: {
        active: true,
        name: 'Harbor Owner',
        passwordHash: await hashValue('OwnerPass123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const waiter = await User.findOneAndUpdate(
    { email: 'waiter@harborgrill.test' },
    {
      $set: {
        active: true,
        name: 'Floor Waiter',
        passwordHash: await hashValue('WaiterPass123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const kitchen = await User.findOneAndUpdate(
    { email: 'kitchen@harborgrill.test' },
    {
      $set: {
        active: true,
        name: 'Kitchen Lead',
        passwordHash: await hashValue('KitchenPass123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const manager = await User.findOneAndUpdate(
    { email: 'manager@harborgrill.test' },
    {
      $set: {
        active: true,
        name: 'Service Manager',
        passwordHash: await hashValue('ManagerPass123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const cashier = await User.findOneAndUpdate(
    { email: 'cashier@harborgrill.test' },
    {
      $set: {
        active: true,
        name: 'Cashier Desk',
        passwordHash: await hashValue('CashierPass123!'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  await Promise.all([
    Membership.findOneAndUpdate(
      { branchId: String(branch._id), tenantId: String(tenant._id), userId: String(owner._id) },
      { $set: { role: UserRole.Owner } },
      { returnDocument: 'after', upsert: true },
    ),
    Membership.findOneAndUpdate(
      { branchId: String(branch._id), tenantId: String(tenant._id), userId: String(waiter._id) },
      { $set: { role: UserRole.Waiter } },
      { returnDocument: 'after', upsert: true },
    ),
    Membership.findOneAndUpdate(
      { branchId: String(branch._id), tenantId: String(tenant._id), userId: String(kitchen._id) },
      { $set: { role: UserRole.Kitchen } },
      { returnDocument: 'after', upsert: true },
    ),
    Membership.findOneAndUpdate(
      { branchId: String(branch._id), tenantId: String(tenant._id), userId: String(manager._id) },
      { $set: { role: UserRole.Manager } },
      { returnDocument: 'after', upsert: true },
    ),
    Membership.findOneAndUpdate(
      { branchId: String(branch._id), tenantId: String(tenant._id), userId: String(cashier._id) },
      { $set: { role: UserRole.Cashier } },
      { returnDocument: 'after', upsert: true },
    ),
  ]);

  const plan = await SubscriptionPlan.findOneAndUpdate(
    { code: 'launch' },
    {
      $set: {
        active: true,
        monthlyPrice: 4999,
        name: 'Launch',
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  await Subscription.findOneAndUpdate(
    { provider: 'stripe', providerSubscriptionId: 'sub_seed_launch' },
    {
      $set: {
        planCode: plan.code,
        providerCustomerId: 'cus_seed_harbor',
        status: 'active',
        tenantId: String(tenant._id),
        renewsAt: new Date('2026-05-15T00:00:00.000Z'),
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const category = await MenuCategory.findOneAndUpdate(
    { branchId: String(branch._id), name: 'Signature Plates', tenantId: String(tenant._id) },
    {
      $set: {
        sortOrder: 1,
        subcategories: [
          { id: makeId('subcat'), name: 'From the Grill', sortOrder: 1, visible: true },
          { id: makeId('subcat'), name: 'Chef Pairings', sortOrder: 2, visible: true },
        ],
        visible: true,
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const beverageCategory = await MenuCategory.findOneAndUpdate(
    { branchId: String(branch._id), name: 'Beverages', tenantId: String(tenant._id) },
    {
      $set: {
        sortOrder: 2,
        subcategories: [
          { id: makeId('subcat'), name: 'Coolers', sortOrder: 1, visible: true },
          { id: makeId('subcat'), name: 'Coffee', sortOrder: 2, visible: true },
        ],
        visible: true,
      },
    },
    { returnDocument: 'after', upsert: true },
  );
  const dessertCategory = await MenuCategory.findOneAndUpdate(
    { branchId: String(branch._id), name: 'Desserts', tenantId: String(tenant._id) },
    {
      $set: {
        sortOrder: 3,
        subcategories: [{ id: makeId('subcat'), name: 'After Dinner', sortOrder: 1, visible: true }],
        visible: true,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  for (const item of [
    { categoryId: String(category._id), flags: ['chef_favorite'], name: 'Smoked Pepper Paneer', price: 340 },
    { categoryId: String(category._id), flags: ['chef_favorite'], name: 'Harbor Chicken Steak', price: 460 },
    { categoryId: String(category._id), flags: ['vegan_option'], name: 'Citrus Herb Rice Bowl', price: 295 },
    { categoryId: String(beverageCategory._id), flags: ['popular'], name: 'Mint Nimbu Soda', price: 160 },
    { categoryId: String(beverageCategory._id), flags: ['cold_brew'], name: 'Madras Cold Brew', price: 220 },
    { categoryId: String(dessertCategory._id), flags: ['limited'], name: 'Molten Chocolate Cake', price: 310 },
  ]) {
    await MenuItem.findOneAndUpdate(
      { branchId: String(branch._id), slug: slugify(item.name), tenantId: String(tenant._id) },
      {
        $set: {
          addonGroups: [
            {
              id: makeId('addon'),
              label: 'Extras',
              maxSelections: 2,
              minSelections: 0,
              options: [
                { id: makeId('option'), label: 'Garlic Butter', priceDelta: 30 },
                { id: makeId('option'), label: 'House Salad', priceDelta: 45 },
              ],
            },
          ],
          allergens: ['dairy'],
          available: true,
          branchOverrides: [],
          categoryId: item.categoryId,
          description: `${item.name} served with seasonal kitchen garnish.`,
          dietaryFlags: item.flags,
          media: {
            alt: `${item.name} plated dish`,
            url: 'https://i.pinimg.com/736x/84/81/ab/8481ab5bd88c3c7ea5f087b3a7d99c90.jpg',
          },
          name: item.name,
          price: item.price,
          schedules: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], endTime: '23:00', startTime: '11:00' }],
          slug: slugify(item.name),
          variants: [
            { id: makeId('variant'), label: 'Regular', priceDelta: 0 },
            { id: makeId('variant'), label: 'Large', priceDelta: 80 },
          ],
        },
      },
      { returnDocument: 'after', upsert: true },
    );
  }

  const floor = await Floor.findOneAndUpdate(
    { branchId: String(branch._id), name: 'Main Hall', tenantId: String(tenant._id) },
    { $set: { sortOrder: 1 } },
    { returnDocument: 'after', upsert: true },
  );

  const seededTables: Record<string, any> = {};
  const tableStatuses: Record<string, TableStatus> = {
    T1: TableStatus.WaitingConfirmation,
    T2: TableStatus.Ready,
    T3: TableStatus.Preparing,
    T4: TableStatus.Occupied,
    T5: TableStatus.Free,
  };

  for (const tableNo of ['T1', 'T2', 'T3', 'T4', 'T5']) {
    const table = await RestaurantTable.findOneAndUpdate(
      { branchId: String(branch._id), tableNo, tenantId: String(tenant._id) },
      {
        $set: {
          capacity: 4,
          floorId: String(floor._id),
          status: tableStatuses[tableNo],
        },
      },
      { returnDocument: 'after', upsert: true },
    );
    seededTables[tableNo] = table;

    await QrCode.findOneAndUpdate(
      { tableId: String(table._id) },
      {
        $set: {
          branchId: String(branch._id),
          tenantId: String(tenant._id),
          token: `qr-${tableNo.toLowerCase()}`,
          version: 1,
        },
      },
      { returnDocument: 'after', upsert: true },
    );
  }

  const menuItems = await MenuItem.find({ branchId: String(branch._id), tenantId: String(tenant._id) }).lean().exec();
  const itemBySlug = new Map(menuItems.map((item) => [item.slug, item]));
  const orderSeeds = [
    {
      orderNo: 'HG-1008',
      status: OrderStatus.PendingConfirmation,
      tableNo: 'T1',
      items: [
        { slug: 'harbor-chicken-steak', quantity: 2 },
        { slug: 'mint-nimbu-soda', quantity: 2 },
      ],
    },
    {
      orderNo: 'HG-1007',
      status: OrderStatus.Accepted,
      tableNo: 'T4',
      items: [
        { slug: 'smoked-pepper-paneer', quantity: 2 },
        { slug: 'citrus-herb-rice-bowl', quantity: 1 },
      ],
    },
    {
      orderNo: 'HG-1006',
      status: OrderStatus.Preparing,
      tableNo: 'T3',
      items: [
        { slug: 'harbor-chicken-steak', quantity: 1 },
        { slug: 'madras-cold-brew', quantity: 2 },
      ],
    },
    {
      orderNo: 'HG-1005',
      status: OrderStatus.Ready,
      tableNo: 'T2',
      items: [
        { slug: 'molten-chocolate-cake', quantity: 2 },
        { slug: 'mint-nimbu-soda', quantity: 1 },
      ],
    },
  ];

  for (const seedOrder of orderSeeds) {
    const table = seededTables[seedOrder.tableNo];
    const qr = await QrCode.findOne({ tableId: String(table._id) }).lean().exec();
    const orderItems = seedOrder.items.map((line) => {
      const menuItem = itemBySlug.get(line.slug);
      if (!menuItem) {
        throw new Error(`Missing seeded menu item ${line.slug}`);
      }
      return {
        addonSnapshots: [],
        menuItemId: String(menuItem._id),
        name: menuItem.name,
        quantity: line.quantity,
        unitPrice: menuItem.price,
      };
    });
    const subtotal = orderItems.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
    const taxTotal = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + taxTotal;

    const tableSession = await TableSession.findOneAndUpdate(
      { tableId: String(table._id), status: 'active' },
      {
        $set: {
          branchId: String(branch._id),
          bucket: {
            items: orderItems.map((line) => ({
              addons: [],
              addedByParticipantId: 'seed-guest',
              id: makeId('bucket'),
              menuItemId: line.menuItemId,
              name: line.name,
              price: line.unitPrice,
              quantity: line.quantity,
            })),
            state: seedOrder.status === OrderStatus.PendingConfirmation ? 'open' : 'locked',
            totals: { grandTotal, subtotal, taxTotal },
            version: 1,
          },
          openedAt: new Date(),
          participants: [{ active: true, alias: 'Guest', id: 'seed-guest', joinedAt: new Date() }],
          qrCodeId: String(qr?._id),
          tenantId: String(tenant._id),
        },
      },
      { returnDocument: 'after', upsert: true },
    );

    await Order.findOneAndUpdate(
      { tableSessionId: String(tableSession._id) },
      {
        $set: {
          branchId: String(branch._id),
          grandTotal,
          items: orderItems,
          orderNo: seedOrder.orderNo,
          serviceMode: BranchServiceMode.Hybrid,
          source: 'pwa',
          status: seedOrder.status,
          submittedAt: new Date(),
          subtotal,
          tableId: String(table._id),
          tableSessionId: String(tableSession._id),
          taxTotal,
          tenantId: String(tenant._id),
        },
      },
      { returnDocument: 'after', upsert: true },
    );
  }

  const activeSession = await TableSession.findOne({ tableId: String(seededTables.T4._id), status: 'active' }).lean().exec();
  if (activeSession) {
    for (const request of [
      { assignedUserId: String(waiter._id), requestType: 'Call waiter', status: ServiceRequestStatus.Assigned },
      { requestType: 'Water refill', status: ServiceRequestStatus.Open },
      { assignedUserId: String(cashier._id), requestType: 'Bill request', status: ServiceRequestStatus.Assigned },
    ]) {
      await ServiceRequest.findOneAndUpdate(
        {
          branchId: String(branch._id),
          requestType: request.requestType,
          tableSessionId: String(activeSession._id),
        },
        {
          $set: {
            assignedUserId: request.assignedUserId,
            branchId: String(branch._id),
            message: `${request.requestType} requested from ${seededTables.T4.tableNo}.`,
            status: request.status,
            tableId: String(seededTables.T4._id),
            tableSessionId: String(activeSession._id),
            tenantId: String(tenant._id),
          },
        },
        { returnDocument: 'after', upsert: true },
      );
    }
  }

  console.log('[seed] created/updated platform admin:', platformAdmin.email);
  console.log('[seed] created/updated tenant:', tenant.slug);
  console.log('[seed] created/updated branch:', branch.slug);
  console.log('[seed] branchId for admin UI:', String(branch._id));
  console.log('[seed] sample staff: owner@harborgrill.test / waiter@harborgrill.test / kitchen@harborgrill.test');
  console.log('[seed] passwords: OwnerPass123! / WaiterPass123! / KitchenPass123!');

  await disconnectFromDatabase();
}

void seed();
