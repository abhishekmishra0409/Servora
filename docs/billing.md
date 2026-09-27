# Billing And Payments

## SaaS Billing

- Stripe is used for SaaS subscriptions, hosted checkout flows, and customer portal access.
- Stripe webhooks reconcile subscription writes in the API request path for the MVP runtime.
- Supported subscription states: `trialing`, `active`, `grace_period`, `past_due`, `suspended`, and `cancelled`.

## Plan Entitlements

A plan grants numeric caps (`employees`, `branches`, `tables`, `monthlyBills`,
`menuItems`, `customRoles`) and feature flags (`custom_roles`, `multi_outlet`,
`analytics`, `audit_logs`).

- Defaults live in `packages/shared/src/plans.ts`; a super admin overrides them
  per plan, and `Tenant.entitlementOverrides` overrides them per tenant.
- `0` means unlimited.
- Limits block **new** records only. Existing data always keeps working, so a
  downgrade never locks staff out mid-shift.
- A tenant with no subscription falls back to the most restrictive plan, not to
  unlimited.
- Entitlement checks read local MongoDB only and never call Stripe in the
  request path. Stripe sync happens in the webhook handler and the billing
  screens; the cache is invalidated on webhook and super-admin writes.

Refused creates return 403 with `error.code = "PLAN_LIMIT_REACHED"`. See
[permissions.md](permissions.md).

## Restaurant Order Payments

- Waiters can request a bill with `POST /api/v1/orders/:id/bill-request`.
- Cashiers and owners can create checkout sessions with `POST /api/v1/payments/checkout-session`.
- Cash payments are confirmed through `POST /api/v1/payments/:id/mark-cash-paid`.
- Customers can view public payment state for their QR-scoped orders from the bill page.
- Stripe payment webhook metadata should include `orderId` and `paymentId`; successful payments capture the `Payment`, close the order, and close the table session when all orders are settled.
