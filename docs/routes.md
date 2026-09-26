# Route Notes

## CMS

- Dashboard: KPIs, live order queue, service request signals, and realtime branch updates.
- Orders: grouped status list, confirm/reject actions, and order state transitions.
- Tables: table CRUD, customer QR preview, regeneration, and download (PNG per table or one PDF for the whole outlet), realtime table status, and floor-aware operations. There is no separate QR screen.
- Floors: create, update, and delete branch floors.
- Menu item editor: basics, pricing, add-ons, scheduling, Cloudinary upload, and media preview.
- Audit logs: owner/manager review of staff, menu, table, order, service, and billing actions.
- Analytics: branch overview and menu mix with realtime refresh.
- Staff: staff accounts per outlet, with the role picker fed from this tenant's
  built-in and custom roles.
- Roles and Access (`/staff/roles`): build tenant-defined roles on a screen-by-
  action grid, starting from a built-in template. Owner-only by default.
- Outlets (`/branches`): visible to any staff role; creating, renaming, and
  archiving are owner-level and additionally gated by the plan's outlet cap and
  the `multi_outlet` feature. The last active outlet cannot be archived.
- Subscription: SaaS billing, portal handoff, and plan usage meters.

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
