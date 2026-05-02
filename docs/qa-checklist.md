# QA Checklist

- Auth routes return JWTs for staff and guest flows.
- Branch service mode toggles between waiter-confirmed and self-service order starts.
- Duplicate bucket submit requests with the same idempotency key do not create duplicate orders.
- Realtime events land in branch and table session rooms.
- CMS routes render loading, empty, and error states.
- Docker Compose starts MongoDB and Redis before application services.

