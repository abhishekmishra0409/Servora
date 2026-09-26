import type { RoleKey } from './screen-permissions';

export interface StaffJwtPayload {
  branchId?: string;
  email: string;
  /** Built-in `UserRole` value or a tenant-defined role key. */
  role: RoleKey;
  sub: string;
  tenantId: string;
  type: 'staff';
}

export interface GuestJwtPayload {
  alias: string;
  branchId: string;
  participantId: string;
  sub: string;
  tableSessionId: string;
  tenantId: string;
  type: 'guest';
}

