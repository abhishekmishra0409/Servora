# Deployment

## Active Apps

- Deploy only `apps/api` and `apps/web` as Node.js applications.
- Keep MongoDB available to the API.

## API Deployment

- Build with `npm run build:api`.
- Start with `npm run start:api`.
- Set `MONGODB_URI`, `MONGODB_DB_NAME`, JWT secrets, `WEB_URL`, `CORS_ORIGINS`, Stripe keys, and Cloudinary keys.
- JWT secrets must be strong and distinct — the API refuses to boot with placeholder values, and requires >= 32 chars in production. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
- Indexes are not built on boot in production (`autoIndex` is off). Run `npm run sync-indexes` after each deploy.
- Keep `/api/v1/webhooks/stripe` publicly reachable. Signatures are verified in every environment whenever Stripe is configured, so `STRIPE_WEBHOOK_SECRET` is required.
- Use `/api/v1/ready` for readiness; it checks MongoDB.

## Web Deployment

- Build with `npm run build:web`.
- Start with `npm run start:web`.
- For same-origin hosting (web and API behind one domain), leave the `NEXT_PUBLIC_*` values blank and let Next.js proxy `/api/v1` and `/socket.io` to `API_URL`. No host/IP is baked into the bundle, so IP/DNS changes never break the app.
- For split-domain hosting, set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_REALTIME_URL` to the public API origin, and `NEXT_PUBLIC_CUSTOMER_ORIGIN` to the public web origin. These are inlined at build time — rebuild the web app after changing them.
- Generate table QR codes from the deployed domain (not `localhost`) so the encoded customer URL is reachable by diners.

## Secrets & Rotation

- `.env` is gitignored; never commit it and never keep shared/live production secrets in a developer's copy.
- Rotate any credential that has been shared or committed (MongoDB, Stripe, Cloudinary, Redis, JWT secrets). Prefer a secrets manager over a plaintext `.env` in production.

## Docker Compose

- `docker compose up --build` starts MongoDB, API, and web only.
- The API container exposes `4000`; the web container exposes `3000`.

## Operations

- Backup MongoDB with `npm run backup:mongo`. Set `BACKUP_DIR` to choose the target folder.
- Restore a dump with `npm run restore:mongo -- <backup-directory>`.
