import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'restaurent_saas';

const TENANT_ID = new mongoose.Types.ObjectId('69eccf8686dd69a512a12cc9');
const BRANCH_ID = new mongoose.Types.ObjectId('69eccf8686dd69a512a12cc9');

const TableSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  branchId: mongoose.Schema.Types.ObjectId,
  floorId: mongoose.Schema.Types.ObjectId,
  tableNo: String,
  capacity: Number,
  status: String,
  qrToken: String,
}, { timestamps: true, collection: 'tables' });

const OrderSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  branchId: mongoose.Schema.Types.ObjectId,
  tableSessionId: mongoose.Schema.Types.ObjectId,
  tableId: mongoose.Schema.Types.ObjectId,
  orderNo: String,
  serviceMode: String,
  status: String,
  source: String,
  subtotal: Number,
  taxTotal: Number,
  grandTotal: Number,
  submittedAt: Date,
  notes: String,
  items: Array,
}, { timestamps: true, collection: 'orders' });

const ServiceRequestSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  branchId: mongoose.Schema.Types.ObjectId,
  tableSessionId: mongoose.Schema.Types.ObjectId,
  tableId: mongoose.Schema.Types.ObjectId,
  requestType: String,
  status: String,
}, { timestamps: true, collection: 'service_requests' });

const Table = mongoose.model('Table', TableSchema);
const Order = mongoose.model('Order', OrderSchema);
const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

async function seed() {
  console.log('Connecting to database...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  console.log('Connected.');

  console.log('Clearing old data for this branch...');
  await Table.deleteMany({ branchId: BRANCH_ID });
  await Order.deleteMany({ branchId: BRANCH_ID });
  await ServiceRequest.deleteMany({ branchId: BRANCH_ID });

  const floorId = new mongoose.Types.ObjectId();

  // ── Tables ──────────────────────────────────────────────────
  console.log('Inserting tables...');
  const tables = await Table.insertMany([
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '1',  capacity: 4, status: 'occupied',  qrToken: 'QR-T1' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '2',  capacity: 2, status: 'available', qrToken: 'QR-T2' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '3',  capacity: 6, status: 'occupied',  qrToken: 'QR-T3' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '4',  capacity: 2, status: 'occupied',  qrToken: 'QR-T4' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '5',  capacity: 4, status: 'available', qrToken: 'QR-T5' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '6',  capacity: 8, status: 'occupied',  qrToken: 'QR-T6' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '7',  capacity: 4, status: 'occupied',  qrToken: 'QR-T7' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '8',  capacity: 2, status: 'available', qrToken: 'QR-T8' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '9',  capacity: 4, status: 'occupied',  qrToken: 'QR-T9' },
    { tenantId: TENANT_ID, branchId: BRANCH_ID, floorId, tableNo: '10', capacity: 6, status: 'available', qrToken: 'QR-T10' },
  ]);

  // ── Orders ──────────────────────────────────────────────────
  console.log('Inserting orders...');

  // Waiter-visible (pending)
  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[1]!._id, // T2
    orderNo: 'ORD-2001', serviceMode: 'dine_in', status: 'pending', source: 'pwa',
    subtotal: 480, taxTotal: 86, grandTotal: 566,
    submittedAt: minutesAgo(2),
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Wagyu Burger',      quantity: 1, unitPrice: 280, variantLabel: 'Medium Rare', notes: 'No pickles', addonSnapshots: [] },
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Truffle Fries',     quantity: 2, unitPrice: 100, addonSnapshots: [] },
    ]
  });

  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[7]!._id, // T8
    orderNo: 'ORD-2002', serviceMode: 'dine_in', status: 'pending', source: 'waiter',
    subtotal: 330, taxTotal: 59, grandTotal: 389,
    submittedAt: minutesAgo(1),
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Seared Salmon',     quantity: 1, unitPrice: 330, variantLabel: 'Asparagus & Lemon Butter', addonSnapshots: [] },
    ]
  });

  // Kitchen - ACCEPTED (just received, not started)
  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[0]!._id, // T1
    orderNo: 'ORD-1001', serviceMode: 'dine_in', status: 'accepted', source: 'pwa',
    subtotal: 720, taxTotal: 130, grandTotal: 850,
    submittedAt: minutesAgo(12), // >10m → urgent
    notes: 'VIP guest. Anniversary dinner. Ensure perfect presentation.',
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Harbor Chicken Steak', quantity: 2, unitPrice: 280, variantLabel: 'Extra Crispy', notes: 'ALLERGY: Peanut — sauce on side', addonSnapshots: [] },
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Truffle Fries',         quantity: 1, unitPrice: 160, addonSnapshots: [] },
    ]
  });

  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[2]!._id, // T3
    orderNo: 'ORD-1002', serviceMode: 'dine_in', status: 'accepted', source: 'pwa',
    subtotal: 280, taxTotal: 50, grandTotal: 330,
    submittedAt: minutesAgo(3),
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Wagyu Burger',      quantity: 1, unitPrice: 280, variantLabel: 'Medium Rare', notes: 'No pickles', addonSnapshots: [] },
    ]
  });

  // Kitchen - PREPARING (in progress)
  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[5]!._id, // T6
    orderNo: 'ORD-1003', serviceMode: 'dine_in', status: 'preparing', source: 'pwa',
    subtotal: 660, taxTotal: 119, grandTotal: 779,
    submittedAt: minutesAgo(18),
    notes: 'Course 2 of 3. Table has already had starters.',
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Caesar Salad',      quantity: 1, unitPrice: 160, addonSnapshots: [] },
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Seared Salmon',     quantity: 2, unitPrice: 330, variantLabel: 'Asparagus & Lemon Butter', addonSnapshots: [] },
    ]
  });

  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[8]!._id, // T9
    orderNo: 'ORD-1004', serviceMode: 'dine_in', status: 'preparing', source: 'waiter',
    subtotal: 540, taxTotal: 97, grandTotal: 637,
    submittedAt: minutesAgo(8),
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Truffle Mushroom Risotto', quantity: 1, unitPrice: 340, notes: 'ALLERGY: Dairy — use vegan cheese, add grilled chicken', addonSnapshots: [] },
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Crispy Calamari',          quantity: 2, unitPrice: 100, notes: 'Extra crispy, sauce on the side', addonSnapshots: [] },
    ]
  });

  // Kitchen - READY (waiting for runner)
  await Order.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[3]!._id, // T4
    orderNo: 'ORD-1005', serviceMode: 'dine_in', status: 'ready', source: 'pwa',
    subtotal: 480, taxTotal: 86, grandTotal: 566,
    submittedAt: minutesAgo(22),
    items: [
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Grilled Sea Bass',  quantity: 2, unitPrice: 240, addonSnapshots: [] },
      { menuItemId: new mongoose.Types.ObjectId(), name: 'Mango Sorbet',      quantity: 1, unitPrice: 0,   addonSnapshots: [] },
    ]
  });

  // Service requests (for waiter board)
  console.log('Inserting service requests...');
  await ServiceRequest.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[2]!._id, requestType: 'waiter', status: 'open',
  });
  await ServiceRequest.create({
    tenantId: TENANT_ID, branchId: BRANCH_ID,
    tableSessionId: new mongoose.Types.ObjectId(),
    tableId: tables[6]!._id, requestType: 'bill', status: 'open',
  });

  console.log('✅ Seeding complete.');
  console.log('   Tables:          10');
  console.log('   Orders (pending): 2  (waiter board)');
  console.log('   Orders (accepted):2  (kitchen board → Accepted column)');
  console.log('   Orders (preparing):2 (kitchen board → Preparing column)');
  console.log('   Orders (ready):   1  (kitchen board → Ready column)');
  console.log('   Service requests: 2');
  await mongoose.disconnect();
}

seed().catch(console.error);
