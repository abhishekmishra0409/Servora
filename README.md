# Restaurent SaaS Starter

This monorepo is a runnable starter for a multi-tenant restaurant operating system with a restaurant CMS, QR customer PWA, waiter app, kitchen display, API, realtime gateway, and background workers.

## Architecture Summary

- `apps/api`: NestJS API with MongoDB/Mongoose, JWT auth, idempotent order flows, billing abstractions, and webhook endpoints.
- `apps/realtime`: dedicated Socket.IO gateway with branch, table session, order, and staff rooms.
- `apps/worker`: BullMQ processors for notifications, cleanup, billing reconciliation, and media cleanup.
- `apps/web`: Next.js App Router CMS and customer PWA surfaces.
- `apps/waiter` and `apps/kitchen`: Vite React operational apps.
- `packages/shared`: shared domain types, permissions, event names, and API contracts.

## Repo Structure

```text
apps/
  api/
  realtime/
  worker/
  web/
  waiter/
  kitchen/
packages/
  shared/
docs/
scripts/
```

## Prerequisites

- Node.js 22+
- npm 11+
- MongoDB 8+ or Docker Desktop
- Redis 7+ or Docker Desktop

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill in JWT secrets and provider keys you plan to use.
3. Keep `API_URL`, `WEB_URL`, and `REALTIME_URL` aligned with your local ports.

## Local Dev With npm

```bash
npm install
npm run dev
```

Targeted commands:

```bash
npm run dev:api
npm run dev:web
npm run dev:waiter
npm run dev:kitchen
```

## Local Dev On Your Wi-Fi / Router

You can open the project from another device on the same router, such as a phone, tablet, waiter device, or kitchen display.

1. Start the project on your computer:

```bash
npm run dev
```

2. Find your computer's local network IP.

On Windows PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } |
  Select-Object IPAddress
```

Example IP: `192.168.1.45`

3. Open these URLs from another device on the same Wi-Fi:

```text
Web / CMS / Customer: http://192.168.1.45:3000
Customer QR demo:     http://192.168.1.45:3000/r/harbor-grill/downtown/t/qr-t1
Waiter app:           http://192.168.1.45:4173
Kitchen app:          http://192.168.1.45:4174
API health:           http://192.168.1.45:4000/api/v1/health
Realtime gateway:     http://192.168.1.45:4001
```

Replace `192.168.1.45` with your computer's actual IP.

Notes:

- Do not use `localhost` from a phone or tablet. On that device, `localhost` means the phone/tablet itself.
- The frontend automatically rewrites local API/realtime URLs to the current LAN hostname when opened through your router IP.
- In development, the API allows localhost and private-network origins such as `192.168.x.x`, `10.x.x.x`, and `172.16.x.x` to `172.31.x.x`.
- If the page does not load from another device, allow Node.js through Windows Firewall for ports `3000`, `4000`, `4001`, `4173`, and `4174`.

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

- The repo includes Dockerfiles for each app plus GitHub Actions workflows.
- Managed MongoDB and Redis are the expected production defaults.
- Keep billing webhooks source-of-truth driven and idempotent in every environment.

## Verification Checklist

- MongoDB and Redis reachable from the API, realtime, and worker apps.
- Seed data creates a tenant, branch, users, menu, tables, and QR codes.
- Customer table join and bucket submit produce an order once per idempotency key.
- Waiter-confirmed branches keep new orders pending until confirmation.
- Billing webhooks safely ignore duplicate deliveries.
