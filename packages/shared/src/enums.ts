export enum UserRole {
  PlatformAdmin = 'platform_admin',
  Owner = 'owner',
  Manager = 'manager',
  Waiter = 'waiter',
  Kitchen = 'kitchen',
  Cashier = 'cashier',
  Customer = 'customer',
}

export enum BranchServiceMode {
  SelfService = 'self_service',
  WaiterConfirmed = 'waiter_confirmed',
  Hybrid = 'hybrid',
}

export enum OrderStatus {
  PendingConfirmation = 'pending_confirmation',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Preparing = 'preparing',
  Ready = 'ready',
  Served = 'served',
  Closed = 'closed',
}

export enum TableStatus {
  Free = 'free',
  Occupied = 'occupied',
  WaitingConfirmation = 'waiting_confirmation',
  Preparing = 'preparing',
  Ready = 'ready',
}

export enum ServiceRequestStatus {
  Open = 'open',
  Assigned = 'assigned',
  Resolved = 'resolved',
}

export enum PaymentStatus {
  Pending = 'pending',
  Authorized = 'authorized',
  Captured = 'captured',
  Failed = 'failed',
}

export enum SubscriptionStatus {
  Trialing = 'trialing',
  Active = 'active',
  GracePeriod = 'grace_period',
  PastDue = 'past_due',
  Suspended = 'suspended',
  Cancelled = 'cancelled',
}

