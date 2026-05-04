# Billing And Payments

## SaaS Billing

- Stripe is used for SaaS subscriptions, hosted checkout flows, and customer portal access.
- Stripe webhooks queue `billing.reconcile_subscription` jobs so subscription writes happen outside the request path.
- Supported subscription states: `trialing`, `active`, `grace_period`, `past_due`, `suspended`, and `cancelled`.

## Restaurant Order Payments

- Waiters can request a bill with `POST /api/v1/orders/:id/bill-request`.
- Cashiers and owners can create checkout sessions with `POST /api/v1/payments/checkout-session`.
- Cash payments are confirmed through `POST /api/v1/payments/:id/mark-cash-paid`.
- Customers can view public payment state for their QR-scoped orders from the bill page.
- Stripe payment webhook metadata should include `orderId` and `paymentId`; successful payments capture the `Payment`, close the order, and close the table session when all orders are settled.
