import type { UserRole } from './enums';

export interface StaffJwtPayload {
  branchId?: string;
  email: string;
  role: UserRole;
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

