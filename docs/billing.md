# Billing

Supported providers:

- Stripe for SaaS subscriptions, hosted checkout flows, and customer portal access.

Billing lifecycle:

- `trialing`
- `active`
- `grace_period`
- `past_due`
- `suspended`
- `cancelled`

Stripe webhooks are the source of truth for subscription status changes.
