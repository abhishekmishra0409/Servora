# Deployment

## Active Apps

- Deploy only `apps/api` and `apps/web` as Node.js applications.
- Keep MongoDB available to the API.

## API Deployment

- Build with `npm run build:api`.
- Start with `npm run start:api`.
- Set `MONGODB_URI`, `MONGODB_DB_NAME`, JWT secrets, `WEB_URL`, `CORS_ORIGINS`, Stripe keys, and Cloudinary keys.
- Keep `/api/v1/webhooks/stripe` publicly reachable and verify signatures with `STRIPE_WEBHOOK_SECRET`.
- Use `/api/v1/ready` for readiness; it checks MongoDB.

## Web Deployment

- Build with `npm run build:web`.
- Start with `npm run start:web`.
- For same-machine hosting, leave browser API env values blank and let Next.js proxy `/api/v1` and `/socket.io` to `API_URL`.
- For independent hosting, set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_REALTIME_URL` to the public API origin, and set `NEXT_PUBLIC_CUSTOMER_ORIGIN` to the public web origin.

## Docker Compose

- `docker compose up --build` starts MongoDB, API, and web only.
- The API container exposes `4000`; the web container exposes `3000`.

## Operations

- Backup MongoDB with `npm run backup:mongo`. Set `BACKUP_DIR` to choose the target folder.
- Restore a dump with `npm run restore:mongo -- <backup-directory>`.
