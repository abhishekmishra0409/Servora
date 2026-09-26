# Restaurent SaaS Project Overview

This document explains the Restaurent project for both non-technical and technical audiences. It is designed as a presentation-ready guide: start from the business idea, understand the user flows, then go deeper into architecture, apps, APIs, data, and local demo usage.

## 1. Executive Summary

Restaurent is a multi-tenant restaurant operating platform. It helps restaurants manage dine-in QR ordering, menu operations, waiter workflows, kitchen order progression, billing follow-up, and owner/admin visibility from one connected system.

In simple terms:

- Customers scan a table QR code, join the table, browse the menu, add food to a shared bucket, submit an order, and track status.
- Waiters see pending orders, table activity, ready food, and customer service requests.
- Kitchen staff see live tickets and move them through accepted, preparing, ready, and served states.
- Owners and managers use the CMS to view branch activity, live orders, and menu items.
- The backend keeps the restaurant data consistent, secure, and branch-aware.

The project is built as a monorepo with two active apps plus shared domain code. `apps/api` runs REST APIs and in-process Socket.IO realtime. `apps/web` runs the unified Next.js frontend for the CMS, waiter, kitchen, billing, and customer QR/PWA routes.

## 2. Who Uses The System

| User | What They Need | App / Surface |
| --- | --- | --- |
| Customer | Scan QR, browse menu, create order, track food | Customer PWA in `apps/web` under `/r/...` |
| Waiter | Confirm orders, monitor tables, resolve requests, mark served | Staff workspace in `apps/web` |
| Kitchen | See tickets and update preparation status | Kitchen board in `apps/web` |
| Owner / Manager | View dashboard, live orders, menu items, branch operations | Staff workspace in `apps/web` |
| Platform/Admin | Seed, manage tenants, plans, integrations | API/scripts/admin tooling |

## 3. Product Flow

### Customer Ordering Flow

```mermaid
flowchart TD
  A[Customer scans table QR] --> B[Customer joins table with alias]
  B --> C[Menu loads for tenant and branch]
  C --> D[Customer selects items, variants, add-ons, notes]
  D --> E[Items added to shared bucket]
  E --> F[Customer reviews quantities and totals]
  F --> G[Bucket submitted]
  G --> H{Branch service mode}
  H -->|Waiter confirmed| I[Order waits for waiter confirmation]
  H -->|Self-service| J[Order accepted]
  H -->|Hybrid| I
  I --> K[Waiter confirms or rejects]
  J --> L[Kitchen sees ticket]
  K --> L
  L --> M[Kitchen updates preparing and ready]
  M --> N[Waiter serves order]
  N --> O[Customer sees status progression]
```

### Waiter Flow

```mermaid
flowchart TD
  A[Waiter logs in] --> B[Branch ID stored automatically]
  B --> C[Tables page shows table status and activity]
  B --> D[Pending orders page shows confirmation queue]
  B --> E[Service queue shows customer requests]
  D --> F[Confirm or reject order]
  E --> G[Resolve request]
  C --> H[Open table detail]
  H --> I[Inspect live orders and service needs]
  I --> J[Mark ready orders served]
```

### Kitchen Flow

```mermaid
flowchart TD
  A[Kitchen logs in] --> B[Branch ID stored automatically]
  B --> C[Kitchen board loads live accepted orders]
  C --> D[Move ticket to preparing]
  D --> E[Move ticket to ready]
  E --> F[Waiter handles served follow-up]
```

### Owner / CMS Flow

```mermaid
flowchart TD
  A[Owner opens CMS login] --> B[Owner logs in]
  B --> C[Access token and branch ID stored]
  C --> D[Dashboard shows live branch KPIs]
  C --> E[Orders page manages live orders]
  C --> F[Menu items page reviews menu]
```

## 4. Apps And Responsibilities

| App / Package | Technology | Responsibility |
| --- | --- | --- |
| `apps/web` | Next.js | Unified frontend for CMS, waiter, kitchen, billing, and customer QR/PWA flow |
| `apps/api` | NestJS | Auth, menu, tables, QR, sessions, buckets, orders, service requests, billing, webhooks, and Socket.IO |
| `packages/shared` | TypeScript | Shared enums, API contracts, route constants, permissions, event names |
| `scripts` | TypeScript/shell | Seed, admin creation, migrations, local verification |

## 5. Technical Architecture

```mermaid
flowchart LR
  Customer[Customer PWA] --> Web[Unified Next.js Web]
  Staff[Staff Workspace] --> Web
  Web --> API[NestJS API]
  API --> Mongo[(MongoDB)]
  API --> SocketIO[Socket.IO Gateway]
  API --> Stripe[Stripe]
  API --> Cloudinary[Cloudinary]
```

The API is the source of truth for transactional operations. Socket.IO runs on the API origin under `/socket.io`, and API services publish live events directly to the in-process Socket.IO gateway.

## 6. Main Backend Domains

| Domain | What It Handles |
| --- | --- |
| Auth | Staff login, refresh, logout, current user |
| Tenants and branches | Multi-tenant restaurant structure |
| Tables and QR | Table list, table creation, QR tokens, regeneration, and PNG/PDF download |
| Outlets | Branch create, rename, and archive, capped by the plan |
| Roles and permissions | Tenant-defined roles and per-outlet permission resolution |
| Entitlements | Plan limits and feature flags, enforced on create |
| Guest sessions | Customer join flow and guest JWTs |
| Buckets | Shared table bucket, add/update/remove item, submit order |
| Menu | Public menu, CMS menu categories/items |
| Orders | Live orders, detail, confirmation, rejection, status updates |
| Service requests | Customer requests and waiter resolution |
| Analytics | Branch overview and menu analytics |
| Billing | Stripe checkout and customer portal |
| Media | Signed uploads for menu media |
| Webhooks | Stripe webhook processing |

## 7. Important API Families

Base API path: `/api/v1`

| Endpoint Family | Example | Purpose |
| --- | --- | --- |
| Auth | `POST /auth/login` | Staff login |
| Public context | `GET /public/table-context?qrToken=qr-t1` | Resolve QR token into tenant, branch, table, and session context |
| Public order status | `GET /public/orders/:id/status?qrToken=...` | Customer-safe order status lookup |
| Menu | `GET /menu?tenantId=...&branchId=...` | Customer menu loading |
| Buckets | `POST /buckets/:tableSessionId/items` | Add customer item |
| Buckets | `POST /buckets/:tableSessionId/submit` | Submit order with idempotency |
| Orders | `GET /orders/live?branchId=...` | Staff live order queue |
| Orders | `POST /orders/:id/confirm` | Waiter confirms order |
| Orders | `PATCH /orders/:id/status` | Kitchen/waiter status update |
| Service requests | `GET /service-requests?branchId=...` | Waiter service queue |
| CMS tables | `GET /cms/tables?branchId=...` | Branch table list |
| CMS menu | `GET /cms/menu/items?branchId=...` | Branch menu item list |
| Session | `GET /auth/session` | Effective permissions, outlets, and plan usage |
| Outlet switch | `POST /auth/switch-branch` | Re-issue a session for another outlet |
| Roles | `GET /cms/roles?tenantId=...` | Built-in plus tenant-defined roles |
| Entitlements | `GET /cms/entitlements?tenantId=...` | Plan limits with live usage |
| Outlets | `POST /branches` | Create a location, capped by the plan |

## 8. Key Data Model Concepts

```mermaid
erDiagram
  TENANT ||--o{ BRANCH : owns
  BRANCH ||--o{ TABLE : has
  TABLE ||--|| QR_CODE : has
  TABLE ||--o{ TABLE_SESSION : opens
  TABLE_SESSION ||--o{ PARTICIPANT : includes
  TABLE_SESSION ||--|| BUCKET : has
  BUCKET ||--o{ BUCKET_ITEM : contains
  TABLE_SESSION ||--o{ ORDER : creates
  ORDER ||--o{ ORDER_ITEM : snapshots
  TABLE_SESSION ||--o{ SERVICE_REQUEST : creates
  BRANCH ||--o{ MENU_ITEM : offers
  BRANCH ||--o{ USER_MEMBERSHIP : assigns
  TENANT ||--o{ ROLE : defines
  ROLE ||--o{ USER_MEMBERSHIP : assigned_by_key
```

Important ideas:

- A tenant is a restaurant business.
- A branch is a specific location.
- A table has a QR code.
- A table session begins when customers join through a QR.
- A bucket is the shared draft order for the table.
- An order is an immutable snapshot created when the bucket is submitted.
- Staff users work inside tenant/branch memberships, and can hold a different role at each outlet.
- A role is either built-in (defined in code) or tenant-defined (a `roles` document). See [permissions.md](permissions.md).

## 9. Current Demo Data

The seed script creates a sample restaurant:

| Item | Value |
| --- | --- |
| Tenant slug | `harbor-grill` |
| Branch slug | `downtown` |
| Customer QR URL | `http://localhost:3000/r/harbor-grill/downtown/t/qr-t1` |
| Other QR tokens | `qr-t2`, `qr-t3`, `qr-t4`, `qr-t5` |

Seeded users:

| Role | Email | Password | App |
| --- | --- | --- | --- |
| Owner | `owner@harborgrill.test` | `OwnerPass123!` | `http://localhost:3000/login` |
| Manager | `manager@harborgrill.test` | `ManagerPass123!` | `http://localhost:3000/login` |
| Waiter | `waiter@harborgrill.test` | `WaiterPass123!` | `http://localhost:3000/login` |
| Kitchen | `kitchen@harborgrill.test` | `KitchenPass123!` | `http://localhost:3000/login` |
| Cashier | `cashier@harborgrill.test` | `CashierPass123!` | `http://localhost:3000/login` |
| Super admin | `superadmin@servora.test` | from `.env` or `SuperAdminPass123!` | `http://localhost:3000/login` |
| Platform admin | `platform@example.com` | from `.env` or `ChangeMe123!` | Admin tooling |

These are the values `npm run seed` writes. Passwords changed after seeding are
not reflected here — check with whoever owns the environment. Login requires at
least 8 characters (`LoginDto`), so any replacement must meet that.

For owner, waiter, kitchen, manager, and cashier login, Branch ID can be left blank for the seeded single-branch account. The login response returns the branch ID and role, and the unified frontend stores them automatically.

## 10. Local Running URLs

| Service | URL |
| --- | --- |
| Web / CMS / Customer PWA | `http://localhost:3000` |
| API health | `http://localhost:4000/api/v1/health` |
| Realtime gateway | `http://localhost:4000` |
| Staff dashboard | `http://localhost:3000/dashboard` |
| Kitchen board | `http://localhost:3000/kitchen-board` |
| Bills | `http://localhost:3000/bills` |

### Real Devices & Production

The app is same-origin: the browser calls relative `/api/v1` and `/socket.io`,
which the Next.js server proxies to the API. Nothing about the host/IP is baked
into the web bundle, so no per-machine URL configuration is needed and an IP/DNS
change never breaks the app.

- For local dev, use `http://localhost:3000` on the machine running the project.
- For demos on other devices or production, deploy behind a real domain (or a
  reverse proxy) and open that domain. For split-domain hosting, set
  `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_REALTIME_URL` to the API origin and rebuild
  the web app.
- Generate table QR codes from the deployed domain so the encoded customer URL is
  reachable by diners' phones.

> The earlier LAN/router-IP workflow (hardcoding `192.168.x` into the bundle) has
> been removed — it broke the app on every DHCP change.

Common commands:

```bash
npm install
npm run seed
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

## 11. What Is Implemented Now

Customer:

- QR context loading
- Join table with alias
- Public menu loading
- Item variants, add-ons, quantity, notes
- Shared bucket review
- Submit order
- Status tracking

Waiter:

- Login
- Auto branch storage
- Table dashboard with table status and QR token
- Pending order confirmation/rejection
- Service queue with resolve action
- Table detail view
- Ready order served follow-up

Kitchen:

- Login
- Auto branch storage
- Live board grouped by order status
- Status progression from accepted to preparing, ready, served

CMS:

- Owner login
- Dashboard live KPIs
- Live order management
- Menu item list/review
- Tenant-defined roles built on a screen-by-action grid
- Permission-driven navigation and per-control gating
- Outlet create/rename/archive with an outlet switcher
- Plan usage meters and upgrade prompts when a cap is reached
- Table QR download as PNG per table or one PDF per outlet

API:

- Auth
- Public QR context
- Customer bucket/order flow
- Staff order workflow
- Service request list/resolve
- CMS table/menu APIs
- Screen-level permission enforcement on every staff route
- Tenant role CRUD with escalation and self-lockout guards
- Plan entitlement checks on staff, tables, outlets, bills, menu items, and roles
- Billing/media/webhook foundations

## 12. Known Gaps And Future Improvements

The current project is an MVP foundation. The next practical improvements are:

- Assign roles per outlet from the staff screen. The data model, `POST /auth/switch-branch`, and the outlet switcher all support it, but the staff editor still edits one membership per branch rather than showing a person with a row per outlet.
- Reserve plan capacity atomically. Limit checks count and compare, so concurrent creates can race past a cap by one. `Counter` is the intended primitive.
- Replace manual/token-style CMS controls fully with protected routes and auth-aware layouts.
- Expand realtime coverage on customer and staff screens while keeping polling fallbacks for resilience.
- Add full CMS menu item create/edit forms.
- Add table-session detail API for richer waiter table detail views.
- Add full bill/payment lifecycle and cashier workflow.
- Add more focused end-to-end coverage for role-based staff workflows.
- Add stronger automated end-to-end tests with seeded local services.
- Add production monitoring, structured logging, and deployment-specific environment hardening.

## 13. How To Present This Project

For non-technical audiences:

- Start with the customer story: scan QR, order, track food.
- Then explain staff impact: waiter and kitchen receive structured work instead of verbal chaos.
- Then explain owner value: visibility into live operations and menu control.
- Avoid code details unless asked.

For technical audiences:

- Start with the monorepo structure.
- Explain the API as source of truth.
- Explain MongoDB entities: tenant, branch, table, session, bucket, order.
- Explain JWT auth separation between guest and staff.
- Explain why permissions are resolved per request instead of carried in the token.
- Explain why order submission uses idempotency.
- Explain realtime updates through Socket.IO rooms on the API origin.

## 14. One-Minute Pitch

Restaurent is a restaurant operations platform that connects the customer table, waiter floor, kitchen station, and owner dashboard. Customers scan a QR code and order from their table. Waiters confirm orders and handle service requests. Kitchen staff process live tickets. Owners see branch activity and manage menu data. The system is multi-tenant, branch-aware, and built with a NestJS API, MongoDB, in-process Socket.IO realtime, and one unified Next.js frontend.
