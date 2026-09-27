import { Reflector } from '@nestjs/core';
import {
  BUILTIN_ROLE_PERMISSIONS,
  expandPermissions,
  isValidPermission,
  PERMISSION_SET,
  UserRole,
} from '@restaurent/shared';

import { PERMISSIONS_KEY, type PermissionRequirement } from '../decorators/require-permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AnalyticsController } from '../../modules/analytics/analytics.controller';
import { AuditLogsController } from '../../modules/audit-logs/audit-logs.controller';
import { BillingController } from '../../modules/billing/billing.controller';
import { BranchesController } from '../../modules/branches/branches.controller';
import { FloorsController } from '../../modules/floors/floors.controller';
import { MediaController } from '../../modules/media/media.controller';
import { MenuController } from '../../modules/menu/menu.controller';
import { OrdersController } from '../../modules/orders/orders.controller';
import { PaymentsController } from '../../modules/payments/payments.controller';
import { ServiceRequestsController } from '../../modules/service-requests/service-requests.controller';
import { StaffController } from '../../modules/staff/staff.controller';
import { TablesController } from '../../modules/tables/tables.controller';
import { TenantsController } from '../../modules/tenants/tenants.controller';

/**
 * The safety net for the role → permission migration.
 *
 * Every guarded route is checked twice: once under the old `@Roles(...)` tuple
 * and once under the new `@RequirePermissions(...)` set. For each built-in role
 * the two answers must be identical. If they diverge, either a permission
 * string is wrong or a built-in template drifted — both of which would lock
 * real users out of screens they use today.
 */

const reflector = new Reflector();

// Platform roles bypass tenant permission checks entirely (in both guards), so
// they are not part of the parity comparison.
const TENANT_ROLES = [
  UserRole.Owner,
  UserRole.Manager,
  UserRole.Waiter,
  UserRole.Kitchen,
  UserRole.Cashier,
] as const;

const CONTROLLERS = [
  AnalyticsController,
  AuditLogsController,
  BillingController,
  BranchesController,
  FloorsController,
  MediaController,
  MenuController,
  OrdersController,
  PaymentsController,
  ServiceRequestsController,
  StaffController,
  TablesController,
  TenantsController,
];

interface RouteUnderTest {
  handler: string;
  name: string;
  permissions: string[];
  roles: string[];
}

const routesFor = (controller: new (...args: never[]) => object): RouteUnderTest[] => {
  const proto = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(proto)
    .filter((key) => {
      if (key === 'constructor' || typeof proto[key] !== 'function') {
        return false;
      }

      // Private helpers inherit the class-level @Roles metadata but are not
      // routes; only methods Nest gave a path are.
      return Reflect.getMetadata('path', proto[key] as object) !== undefined;
    })
    .map((key) => {
      const handler = proto[key] as () => unknown;
      const roles = reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, controller]) ?? [];
      const requirement = reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
        handler,
        controller,
      ]);

      return {
        handler: key,
        name: `${controller.name}.${key}`,
        permissions: requirement?.anyOf ?? [],
        roles,
      };
    })
    .filter((route) => route.roles.length > 0);
};

const allRoutes = CONTROLLERS.flatMap(routesFor);

const permissionsOfRole = (role: string): ReadonlySet<string> =>
  expandPermissions(BUILTIN_ROLE_PERMISSIONS[role] ?? []);

describe('permission registry', () => {
  it('has at least one guarded route to check', () => {
    expect(allRoutes.length).toBeGreaterThan(20);
  });

  it('only references permissions that exist in the registry', () => {
    const unknown = allRoutes.flatMap((route) =>
      route.permissions.filter((permission) => !isValidPermission(permission)).map((permission) => `${route.name} -> ${permission}`),
    );

    expect(unknown).toEqual([]);
  });

  it('gives every built-in role only real permissions', () => {
    for (const [role, permissions] of Object.entries(BUILTIN_ROLE_PERMISSIONS)) {
      const unknown = permissions.filter((permission) => !PERMISSION_SET.has(permission));
      expect({ role, unknown }).toEqual({ role, unknown: [] });
    }
  });
});

describe('every guarded route carries a permission requirement', () => {
  it.each(allRoutes.map((route) => [route.name, route] as const))('%s', (_name, route) => {
    expect(route.permissions.length).toBeGreaterThan(0);
  });
});

describe('new permission checks match the old role tuples', () => {
  const cases = allRoutes.flatMap((route) =>
    TENANT_ROLES.map((role) => [`${route.name} as ${role}`, route, role] as const),
  );

  it.each(cases)('%s', (_name, route, role) => {
    const allowedByRole = route.roles.includes(role);
    const held = permissionsOfRole(role);
    const allowedByPermission = route.permissions.some((permission) => held.has(permission));

    expect({ route: route.name, role, allowed: allowedByPermission }).toEqual({
      route: route.name,
      role,
      allowed: allowedByRole,
    });
  });
});
