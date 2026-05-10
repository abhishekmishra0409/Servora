# QA Checklist

- Staff login, refresh, and logout work for owner, manager, waiter, kitchen, and cashier roles.
- Branch service mode toggles between waiter-confirmed and self-service order starts.
- Duplicate bucket submit requests with the same idempotency key do not create duplicate orders.
- API mutations enqueue BullMQ jobs for notifications, billing reconciliation, media cleanup, cleanup, and analytics.
- Worker processors persist successful attempts and write exhausted failures to `dead_letter_jobs`.
- Realtime events land in branch and table session rooms, with 30 second polling fallback in UI screens.
- Cross-tenant and cross-branch reads or mutations are rejected for orders, payments, tables, floors, menu, staff, and branches.
- Payment lifecycle covers bill requested, cash paid, Stripe success, Stripe failure, and table close only after settlement.
- Analytics date filters count revenue in the selected branch/date range.
- CMS audit logs and floor management pages render loading, empty, success, and error states.
- Customer menu dietary and allergen filters work with live menu data.
- `/ready` reports unhealthy when MongoDB or Redis is unavailable.
- Docker Compose starts MongoDB and Redis before the active API and web services.
- With `EMBEDDED_WORKERS=true`, API startup creates BullMQ processors and consumes queued jobs without a separate worker process.
