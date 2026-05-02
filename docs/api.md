# API Notes

Base path: `/api/v1`

Implemented endpoint families:

- Auth: login, refresh, logout, me
- Guest sessions: create and join table session
- CMS menu: categories and items CRUD
- Tables and QR: list, create, update, regenerate token
- Buckets: add, update, remove, submit
- Orders: live list, detail, confirm, reject, status transitions
- Service requests: create and resolve
- Billing: checkout-session and customer portal
- Media: sign-upload
- Webhooks: Stripe

Example request:

```http
POST /api/v1/buckets/ts_123/submit
Idempotency-Key: bucket-submit-001
Authorization: Bearer <guest-token>
Content-Type: application/json

{
  "paymentMethod": "pay_later"
}
```

Example response:

```json
{
  "orderId": "ord_123",
  "orderNo": "BR-0001",
  "status": "pending_confirmation"
}
```
