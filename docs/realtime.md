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

The realtime service consumes internal API events from Redis and broadcasts them to Socket.IO rooms. CMS, customer, waiter, and kitchen screens keep polling fallbacks between 30 and 60 seconds when socket delivery is unavailable.
