# Restaurent SaaS Starter

This monorepo is a runnable starter for a multi-tenant restaurant operating system with one backend app and one unified frontend app.

## Architecture Summary

- `apps/api`: active NestJS backend with REST APIs, MongoDB/Mongoose, JWT auth, webhooks, Socket.IO gateways, and embedded BullMQ workers.
- `apps/web`: active Next.js frontend with CMS, waiter, kitchen, bills, role-based staff workspace, and customer QR/PWA surfaces.
- `apps/realtime`, `apps/worker`, `apps/waiter`, and `apps/kitchen`: archived reference apps kept in GitHub only; root scripts and deployments do not use them.
- `packages/shared`: shared domain types, permissions, event names, and API contracts.

## Repo Structure

```text
apps/
  api/
  web/
  realtime/   # archived reference
  worker/     # archived reference
  waiter/     # archived reference
  kitchen/    # archived reference
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
Web / Staff / Customer: http://192.168.1.45:3000
Customer QR demo:     http://192.168.1.45:3000/r/harbor-grill/downtown/t/qr-t1
Kitchen board:        http://192.168.1.45:3000/kitchen-board
Bills:                http://192.168.1.45:3000/bills
API health:           http://192.168.1.45:4000/api/v1/health
Realtime gateway:     http://192.168.1.45:4000
```

Replace `192.168.1.45` with your computer's actual IP.

Notes:

- Do not use `localhost` from a phone or tablet. On that device, `localhost` means the phone/tablet itself.
- The frontend automatically rewrites local API/realtime URLs to the current LAN hostname when opened through your router IP.
- In development, the API allows localhost and private-network origins such as `192.168.x.x`, `10.x.x.x`, and `172.16.x.x` to `172.31.x.x`.
- If the page does not load from another device, allow Node.js through Windows Firewall for ports `3000` and `4000`.

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
- For separate hosting, set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_REALTIME_URL` in the web app to the hosted API origin.
- Set backend `CORS_ORIGINS` and `WEB_URL` to the hosted web origin.
- Managed MongoDB and Redis are the expected production defaults.
- Keep billing webhooks source-of-truth driven and idempotent in every environment.

## Verification Checklist

- MongoDB and Redis reachable from the API app.
- Seed data creates a tenant, branch, users, menu, tables, and QR codes.
- Customer table join and bucket submit produce an order once per idempotency key.
- Waiter-confirmed branches keep new orders pending until confirmation.
- Billing webhooks safely ignore duplicate deliveries.
