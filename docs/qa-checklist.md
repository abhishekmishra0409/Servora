# QA Checklist

- Staff login, refresh, and logout work for owner, manager, waiter, kitchen, and cashier roles.
- Branch service mode toggles between waiter-confirmed and self-service order starts.
- Duplicate bucket submit requests with the same idempotency key do not create duplicate orders.
- API mutations complete without requiring Redis, BullMQ, or background worker processors.
- Realtime events land in branch and table session rooms, with 30 second polling fallback in UI screens.
- Cross-tenant and cross-branch reads or mutations are rejected for orders, payments, tables, floors, menu, staff, and branches.
- Payment lifecycle covers bill requested, cash paid, Stripe success, Stripe failure, and table close only after settlement.
- Analytics date filters count revenue in the selected branch/date range.
- CMS audit logs and floor management pages render loading, empty, success, and error states.
- Customer menu dietary and allergen filters work with live menu data.
- `/ready` reports unhealthy when MongoDB is unavailable.
- Docker Compose starts MongoDB before the active API and web services.
