# Servora

This monorepo is a runnable starter for a multi-tenant restaurant operating system with one backend app and one unified frontend app.

## Architecture Summary

- `apps/api`: active NestJS backend with REST APIs, MongoDB/Mongoose, JWT auth, webhooks, and Socket.IO gateways.
- `apps/web`: active Next.js frontend with CMS, waiter, kitchen, bills, role-based staff workspace, and customer QR/PWA surfaces.
- `packages/shared`: shared domain types, the screen permission registry, plan entitlement defaults, event names, and API contracts.

## Repo Structure

```text
apps/
  api/
  web/
packages/
  shared/
docs/
scripts/
```

## Access Control And Plans

Staff access is permission-based, not role-name based. Every staff route
declares a `<screen>:<action>` permission, and restaurant owners can build their
own roles from a screen-by-action grid in the CMS (`/staff/roles`).

Subscriptions grant numeric caps (staff, outlets, tables, monthly bills, menu
items, custom roles) and feature flags. Reaching a cap blocks **new** records
only; existing data always keeps working.

Read [docs/permissions.md](docs/permissions.md) before changing roles,
permissions, or plan limits.

## Prerequisites

- Node.js 22+
- npm 11+
- MongoDB 8+ or Docker Desktop

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill in JWT secrets and provider keys you plan to use.
3. Keep `API_URL`, `WEB_URL`, `REALTIME_URL`, and `CORS_ORIGINS` aligned with your local or hosted domains.

## Local Dev With npm

```bash
npm install
npm run dev
```

`npm run dev` starts only the active backend and frontend apps: API on `4000`, web on `3000`.

Targeted commands:

```bash
npm run dev:api
npm run dev:web
npm run build:api
npm run build:web
npm run start:api
npm run start:web
```

## Local Dev

Run everything on your machine over `localhost`:

```bash
npm run dev
```

```text
Web / Staff / Customer: http://localhost:3000
Customer QR demo:       http://localhost:3000/r/harbor-grill/downtown/t/qr-t1
Kitchen board:          http://localhost:3000/kitchen-board
API health:             http://localhost:4000/api/v1/health
```

The app is **same-origin**: the browser calls relative `/api/v1` and `/socket.io`,
and the Next.js server proxies those to the API. There is **no IP to configure** —
nothing about the host is baked into the web bundle, so this works unchanged
whether you open it on `localhost` or on a real domain in production. (An earlier
version hardcoded a LAN/router IP into the bundle, which broke the app on every
DHCP change; that mechanism has been removed.)

## Deploying to a Domain

Production is domain-based. For **same-origin** hosting (web and API behind one
domain, e.g. via a reverse proxy), just set `WEB_URL` and `CORS_ORIGINS` to that
domain and leave the `NEXT_PUBLIC_*` vars blank. For **split-domain** hosting
(API on its own host, e.g. `https://api.example.com`), additionally set
`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_REALTIME_URL` to the API origin — these are
inlined at `next build` time, so rebuild the web app after changing them.

When printing table QR codes, open the CMS from the deployed domain (not
`localhost`) so the encoded customer URL is reachable by diners' phones.

## Local Dev With Docker Compose

```bash
docker compose up --build
```

## Seeding

```bash
npm run seed
npm run create:admin
```

## Running Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:api
npm run build:web
npm run verify
```

## Webhook Notes

- Stripe webhooks are implemented as raw-body verified endpoints.
- For local testing, use the Stripe CLI or proxy tooling and point events at the API webhook route.

## Cloudinary Setup

Set the Cloudinary environment values in `.env` before using menu media upload signatures.

## Stripe Setup

- Create three plan prices and map them to `STRIPE_PRICE_LAUNCH`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_ENTERPRISE`.
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

## Deploy Notes

- `apps/api/Dockerfile` and `apps/web/Dockerfile` can be deployed independently.
- Same-origin hosting: leave `NEXT_PUBLIC_*` blank and let the Next proxy reach the API. Split-domain hosting: set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_REALTIME_URL` to the API origin (rebuild the web app after changing them).
- Set backend `CORS_ORIGINS` and `WEB_URL` to the hosted web origin.
- Managed MongoDB is the expected production default. In production, indexes are not built on boot — run `npm run sync-indexes` after deploy. This is required after any release that adds a collection or index (the `roles` collection and the `memberships` role index were added this way).
- Set strong, distinct `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `JWT_GUEST_SECRET` (the API refuses to boot with placeholder values). Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
- Keep billing webhooks source-of-truth driven and idempotent in every environment; `STRIPE_WEBHOOK_SECRET` is required whenever Stripe is configured (signatures are verified in all environments).

## Secrets

`.env` is gitignored and must never be committed. Do not keep shared or live
production secrets in a developer's `.env`. Rotate any credential that has been
shared or committed (MongoDB, Stripe, Cloudinary, Redis, JWT secrets), and use a
secrets manager for production rather than a plaintext file.

## Verification Checklist

- MongoDB reachable from the API app.
- Seed data creates a tenant, branch, users, menu, tables, and QR codes.
- Customer table join and bucket submit produce an order once per idempotency key.
- A tenant-defined role shows the right sidebar and is refused on screens it lacks.
- Deactivating a staff account ends their session at the next token refresh.
- Reaching a plan cap blocks new records but leaves existing ones working.
- Waiter-confirmed branches keep new orders pending until confirmation.
- Billing webhooks safely ignore duplicate deliveries.
