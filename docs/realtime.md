# Realtime

Rooms:

- `tenant:{tenantId}`
- `branch:{branchId}`
- `tableSession:{tableSessionId}`
- `order:{orderId}`
- `staff:{userId}`

Key events:

- `participant.joined`
- `participant.left`
- `bucket.item_added`
- `bucket.item_updated`
- `bucket.item_removed`
- `bucket.locked`
- `order.created`
- `order.status_updated`
- `payment.bill_requested`
- `payment.status_updated`
- `service_request.created`
- `service_request.assigned`
- `service_request.resolved`
- `table.status_changed`
- `floor.changed`
- `menu.changed`
- `branch.updated`

## Same-origin proxying

The web app proxies `/socket.io/:path*` to the API. Socket.IO polls
`/socket.io/` **with a trailing slash**, and its engine only answers that exact
path, so `apps/web/next.config.ts` sets `skipTrailingSlashRedirect: true`.
Without it Next 308-redirects `/socket.io/` to `/socket.io`, the API returns 404,
and the client retries forever without ever connecting — realtime silently
degrades to polling fallbacks. If you see repeated `/socket.io` 404s in the API
log, that redirect is back.

The API hosts Socket.IO on the same origin as REST traffic under `/socket.io`. API services publish events directly to the in-process Socket.IO server and broadcast them to Socket.IO rooms. CMS, customer, waiter, and kitchen screens keep polling fallbacks between 30 and 60 seconds when socket delivery is unavailable.
