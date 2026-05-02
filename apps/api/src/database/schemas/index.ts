import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { Branch, BranchSchema } from './branch.schema';
import { Counter, CounterSchema } from './counter.schema';
import { Floor, FloorSchema } from './floor.schema';
import { IdempotencyKey, IdempotencyKeySchema } from './idempotency-key.schema';
import { Invoice, InvoiceSchema } from './invoice.schema';
import { Membership, MembershipSchema } from './membership.schema';
import { MenuCategory, MenuCategorySchema } from './menu-category.schema';
import { MenuItem, MenuItemSchema } from './menu-item.schema';
import { Order, OrderSchema } from './order.schema';
import { Payment, PaymentSchema } from './payment.schema';
import { QrCode, QrCodeSchema } from './qr-code.schema';
import { ServiceRequest, ServiceRequestSchema } from './service-request.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from './subscription-plan.schema';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { TableSession, TableSessionSchema } from './table-session.schema';
import { RestaurantTable, RestaurantTableSchema } from './table.schema';
import { Tenant, TenantSchema } from './tenant.schema';
import { User, UserSchema } from './user.schema';

export const databaseModels = [
  { name: AuditLog.name, schema: AuditLogSchema },
  { name: Branch.name, schema: BranchSchema },
  { name: Counter.name, schema: CounterSchema },
  { name: Floor.name, schema: FloorSchema },
  { name: IdempotencyKey.name, schema: IdempotencyKeySchema },
  { name: Invoice.name, schema: InvoiceSchema },
  { name: Membership.name, schema: MembershipSchema },
  { name: MenuCategory.name, schema: MenuCategorySchema },
  { name: MenuItem.name, schema: MenuItemSchema },
  { name: Order.name, schema: OrderSchema },
  { name: Payment.name, schema: PaymentSchema },
  { name: QrCode.name, schema: QrCodeSchema },
  { name: RestaurantTable.name, schema: RestaurantTableSchema },
  { name: ServiceRequest.name, schema: ServiceRequestSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
  { name: TableSession.name, schema: TableSessionSchema },
  { name: Tenant.name, schema: TenantSchema },
  { name: User.name, schema: UserSchema },
];

export * from './audit-log.schema';
export * from './branch.schema';
export * from './counter.schema';
export * from './floor.schema';
export * from './idempotency-key.schema';
export * from './invoice.schema';
export * from './membership.schema';
export * from './menu-category.schema';
export * from './menu-item.schema';
export * from './order.schema';
export * from './payment.schema';
export * from './qr-code.schema';
export * from './service-request.schema';
export * from './subscription-plan.schema';
export * from './subscription.schema';
export * from './table-session.schema';
export * from './table.schema';
export * from './tenant.schema';
export * from './user.schema';
