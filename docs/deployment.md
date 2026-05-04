# Deployment

## Single VPS Docker Compose

- Run `docker compose up --build` with MongoDB and Redis available before app services.
- Deploy `apps/api`, `apps/realtime`, and `apps/worker` as separate Node processes so API traffic, sockets, and BullMQ jobs can scale independently.
- Deploy `apps/web` with Next.js runtime support.
- Deploy `apps/waiter` and `apps/kitchen` as static assets behind HTTPS.
- Set `MONGODB_URI`, `MONGODB_DB_NAME`, `REDIS_URL`, JWT secrets, CORS origins, `SENTRY_DSN`, Stripe keys, and Cloudinary keys in production env.
- Keep `/api/v1/webhooks/stripe` publicly reachable and verify signatures with `STRIPE_WEBHOOK_SECRET`.
- Use `/api/v1/ready` for readiness; it checks MongoDB and Redis instead of returning a static value.

## Operations

- Backup MongoDB with `npm run backup:mongo`. Set `BACKUP_DIR` to choose the target folder.
- Restore a dump with `npm run restore:mongo -- <backup-directory>`.
- Keep Redis persistent enough for BullMQ retries and realtime stream delivery.
- Run the worker with the same `REDIS_URL` and MongoDB settings as the API.
