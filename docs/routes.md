# Route Notes

## CMS

- Dashboard: KPIs, live order queue, service request signals, and realtime branch updates.
- Orders: grouped status list, confirm/reject actions, and order state transitions.
- Tables: table CRUD, QR regeneration, realtime table status, and floor-aware operations.
- Floors: create, update, and delete branch floors.
- QR: QR state, regenerate, print, and export actions.
- Menu item editor: basics, pricing, add-ons, scheduling, Cloudinary upload, and media preview.
- Audit logs: owner/manager review of staff, menu, table, order, service, and billing actions.
- Analytics: branch overview and menu mix with realtime refresh.
- Subscription: SaaS billing and portal handoff.

## Customer PWA

- Landing: alias join form and table entry.
- Menu: categories, dietary filter, allergen exclusion, cards, and bucket quick action.
- Bucket: collaborative item list, participant labels, total, submit, and socket refresh.
- Status: order progress timeline with socket and polling refresh.
- Bill: public order totals and payment status.
- Service: quick request buttons with bill and assistance flows.

## Waiter

- Pending orders, service queue, table list, table detail actions, bill requests, and cash handoff support.

## Kitchen

- Ticket board, item modifiers, rush flags, and state transitions.

## New API Endpoints

- `POST /api/v1/orders/:id/bill-request`
- `POST /api/v1/payments/checkout-session`
- `GET /api/v1/payments/:id`
- `POST /api/v1/payments/:id/mark-cash-paid`
- `GET /api/v1/public/orders/:id/payment`
- `GET /api/v1/cms/audit-logs`
- `GET /api/v1/cms/floors`
- `POST /api/v1/cms/floors`
- `PATCH /api/v1/cms/floors/:id`
- `DELETE /api/v1/cms/floors/:id`
