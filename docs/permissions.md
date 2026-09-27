# Permissions And Plan Entitlements

Two independent gates decide whether a staff request succeeds:

1. **Permissions** — what this person is allowed to do (per outlet).
2. **Entitlements** — what the tenant's subscription allows at all.

A request must pass both. They are separate on purpose: a manager with full
permissions still cannot add a 9th staff member on a plan capped at 8.

## Permission model

A permission is `<screen>:<action>`, for example `orders:view` or
`menu-items:edit`. The registry lives in
`packages/shared/src/screen-permissions.ts` and is the single source of truth
for the API guard, the CMS navigation, and the tenant-facing role builder.

- 18 screens (17 tenant-assignable plus one platform screen), 62 permissions.
- CRUD actions are `view`, `add`, `edit`, `delete`. A screen only declares the
  actions a real endpoint backs, so the role builder renders an em-dash rather
  than a checkbox for the rest.
- Non-CRUD actions are "advanced" and named after the verb: `orders:confirm`,
  `bills:mark-cash-paid`, `tables:regenerate-qr`.
- `dashboard:view` and `settings:view` are **locked** — always granted, so every
  role has somewhere to land after login.
- Screens are grouped for the UI: operations (7), menu (3), admin (7).

The colon separator is deliberate: it keeps these strings unambiguous against
the legacy dotted permissions (`orders.read`, `menu.manage`) in
`packages/shared/src/permissions.ts`, which are now unused by the API.

### Roles

Built-in roles stay in **code**, not the database, so shipping a permission
change to every tenant is a one-line edit rather than a backfill:

| Role | Permissions | Notes |
| --- | --- | --- |
| `owner` | 60 | every tenant-assignable permission |
| `manager` | 41 | no staff, roles, audit logs, subscription, or `bills:checkout` |
| `waiter` | 17 | floor work: orders, bills, tables (view), requests |
| `kitchen` | 10 | kitchen board plus the preparing/ready order statuses |
| `cashier` | 9 | orders (view) and the full bill/payment set |
| `super_admin` / `platform_admin` | all + `platform:*` | bypass tenant permission checks entirely |

Tenants create their own roles on top. A custom role is a `roles` collection
document `{ tenantId, key, name, permissions[] }`, and `Membership.role` stores
either a built-in role value or that role's `key`. `Membership.role` is a plain
string, **not** a schema enum — a tenant-defined key is unbounded, so validation
happens in the service layer against the tenant's assignable set.

Guardrails on role creation (`RolesService`):

- the key is slugified and may not collide with a built-in role name;
- every permission must exist in the registry and be tenant-assignable
  (`platform:*` is refused);
- the requested set must be a subset of what the **creator** already holds, so a
  delegated role-manager cannot escalate;
- a role cannot be deleted while any membership still references it;
- editing a role you personally hold cannot remove `roles:view`, `roles:edit`,
  or `staff:view` — that is the self-lockout guard.

### Where enforcement happens

```
StaffJwtGuard        verify token -> request.user
PermissionsGuard     coarse gate: does this person hold the permission
                     ANYWHERE in the tenant?
AccessService        authoritative: resolve record -> branch, then check the
  .assert*Access     membership covering THAT branch
```

The guard is deliberately coarse. It runs before the handler, so it cannot yet
know which outlet a request touches — `POST /orders/:id/confirm` derives the
branch from the order. It therefore checks the union of permissions across all
the caller's memberships, and `AccessService.assertBranchAccess` does the real,
branch-specific check afterwards.

Routes declare their requirement with `@RequirePermissions('orders:confirm')`.
The holder needs **any one** of the listed permissions, which mirrors how the
`@Roles(...)` tuples this replaced behaved.

`RolesGuard` and the `@Roles(...)` decorators still exist but stand down on any
route that declares permissions — a tenant-defined role has no `UserRole` value,
so the role tuple would reject it regardless of its permissions.
`apps/api/src/common/guards/permission-parity.spec.ts` pins the two models
together: for every guarded route and every built-in role it asserts the
permission check and the old role tuple give the identical answer. Run it before
touching `BUILTIN_ROLE_PERMISSIONS`.

### Permissions are resolved per request, not carried in the JWT

The token holds a role string only. `PermissionResolverService` loads the
membership and role on each request and caches the result in process for 30
seconds.

This is intentional:

- A token carries one `branchId`, but the effective branch is data-dependent, so
  a token claim cannot express "manager at one outlet, waiter at another".
- There is no Redis in this stack, so a JWT-embedded permission set would have
  no revocation channel.
- An edited role therefore takes effect almost immediately instead of surviving
  until every outstanding token expires.
- The cost is near zero: `AccessService` already queried `Membership` on every
  CMS request, so this consolidates a query rather than adding one.

With more than one API instance, worst-case staleness is the 30 second TTL.
`invalidateTenant()` / `invalidateUser()` are called on role and staff writes.

### Sessions

`AuthService.refresh` re-derives the session from the database on every refresh.
It previously re-signed the decoded payload, so a deactivated account, a deleted
membership, or a changed role kept working indefinitely. Refresh now rejects a
token whose user is inactive or whose membership is gone — **deactivating a
staff member ends their session at the next refresh**.

`POST /auth/switch-branch` re-issues a session for a different outlet, because a
person can hold a different role at each one. `GET /auth/session` returns the
effective permissions, the outlets the caller can work in, and the tenant's plan
usage; it is what drives the CMS sidebar, the outlet switcher, and the usage
meters.

## Plan entitlements

`EntitlementsService` (`apps/api/src/infrastructure/entitlements/`) answers what
a tenant's subscription allows. Resolution order:

```
PLAN_DEFAULTS (packages/shared/src/plans.ts)
  <- SubscriptionPlan document (super-admin editable)
    <- Tenant.entitlementOverrides (per-tenant, for custom deals)
```

| Resource | launch | growth | enterprise |
| --- | --- | --- | --- |
| `employees` | 8 | 25 | unlimited |
| `branches` | 1 | 3 | unlimited |
| `tables` | 40 | 150 | unlimited |
| `monthlyBills` | 300 | 1500 | unlimited |
| `menuItems` | 120 | 500 | unlimited |
| `customRoles` | 0 | 5 | unlimited |

`0` means **unlimited**, matching the existing convention. Feature flags gate
whole capabilities rather than counting things: `custom_roles`, `multi_outlet`,
`analytics`, `audit_logs`.

Two rules worth knowing:

- **Limits only block new records.** Nothing is ever deactivated or hidden, so a
  downgrade never locks staff out mid-shift. A tenant over its cap keeps
  everything it has and simply cannot create more.
- **A tenant with no subscription falls back to `launch`**, not to unlimited.
  The previous code returned `null` for a missing plan and skipped every check.
  Access is separately gated by `AccessService.assertTenantActive`.

`EntitlementsService` reads only local MongoDB and caches for 60 seconds. It
deliberately does **not** call Stripe: the checks it replaced called
`getTenantBillingPlan` on every create, which hit Stripe live in the request path
and swallowed failures, so a Stripe outage silently removed all limits. Stripe
sync stays in the webhook handler and the billing screens.

A refused create returns HTTP 403 with a structured body, so the CMS can tell a
plan limit apart from a permission denial without matching on message text:

```json
{
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "details": { "limit": 8, "planCode": "launch", "resource": "employees", "used": 8 },
    "message": "Your plan allows up to 8 staff accounts. Upgrade to add more.",
    "statusCode": 403
  }
}
```

Note the payload is nested under `error` by the API's exception filter.

## Frontend

`apps/web/src/lib/role-access.ts` derives the sidebar from the same registry, so
the navigation always matches what the role builder offers. A link is visible
when the user holds `<screen>:view`.

`CmsSessionProvider` seeds permissions synchronously from `localStorage` (or
derives them locally for a built-in role) so the sidebar is correct on the first
paint, then revalidates against `/auth/session`. The cached copy is **rendering
only** — it is user-editable, and the API guard is what actually authorises
anything.

Pages gate individual controls with `session.can('tables:add')` rather than the
hardcoded role arrays they used before.

## Gotchas

- Adding a screen to `SCREENS` immediately offers it in every tenant's role
  builder. Add the matching `@RequirePermissions` to its routes in the same
  change, or the screen is visible but its API is ungated.
- Granting a new permission to a built-in role changes what existing users can
  do on deploy. `permission-parity.spec.ts` will fail if the change diverges
  from the route's declared requirement — read the failure rather than updating
  the expectation.
- `packages/shared/src/permissions.ts` (the legacy `PERMISSIONS` map and
  `hasPermission`) is no longer used for enforcement. Do not add to it.
