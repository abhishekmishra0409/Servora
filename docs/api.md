# API Notes

Base path: `/api/v1`

Implemented endpoint families:

- Auth: login, refresh, logout, change-password, me, session, switch-branch
- Guest sessions: create and join table session
- CMS menu: categories and items CRUD
- Tables and QR: list, create, update, delete, regenerate token
- Outlets: list, create, update, archive (`/branches`)
- Roles: registry, list, create, update, delete (`/cms/roles`)
- Entitlements: plan limits and live usage (`/cms/entitlements`)
- Buckets: add, update, remove, submit
- Orders: live list, detail, confirm, reject, status transitions
- Service requests: create and resolve
- Billing: checkout-session and customer portal
- Super admin: tenants, tenant status/features/entitlements, plan settings
- Media: sign-upload
- Webhooks: Stripe

## Authorization

Staff routes carry `@RequirePermissions('<screen>:<action>')` and are checked by
`PermissionsGuard`, then scoped to a specific outlet by `AccessService`. See
[permissions.md](permissions.md) for the model, the registry, and how custom
roles resolve.

`GET /auth/session` returns everything the CMS needs to render itself:

```json
{
  "branches": [{ "branchId": "...", "name": "Downtown", "roleKey": "manager" }],
  "entitlements": { "limits": {}, "planCode": "growth", "usage": {} },
  "permissions": ["orders:view", "tables:edit"],
  "role": "manager",
  "tenantId": "...",
  "user": { "email": "...", "id": "...", "name": "..." }
}
```

## Error shape

Failures are wrapped by the exception filter:

```json
{
  "error": { "code": "PLAN_LIMIT_REACHED", "details": {}, "message": "...", "statusCode": 403 },
  "path": "/api/v1/cms/roles",
  "statusCode": 403,
  "timestamp": "..."
}
```

`code` is only set for machine-readable failures. `PLAN_LIMIT_REACHED` means the
tenant's subscription blocked a create — clients should read `error.code` rather
than matching on the message.

Example request:

```http
POST /api/v1/buckets/ts_123/submit
Idempotency-Key: bucket-submit-001
Authorization: Bearer <guest-token>
Content-Type: application/json

{
  "paymentMethod": "pay_later"
}
```

Example response:

```json
{
  "orderId": "ord_123",
  "orderNo": "BR-0001",
  "status": "pending_confirmation"
}
```
