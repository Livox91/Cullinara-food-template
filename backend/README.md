# Restaurant backend

API-only Next.js 16 modular monolith for the restaurant platform. Business, customer, public-menu, checkout, order, inventory, payment, rider, review, audit, outbox, and maintenance modules are implemented. No UI routes are included.

## Run locally

1. Copy `.env.example` to `.env` and configure PostgreSQL and secrets.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:deploy`.
5. Run `npm run dev -- -p 3001`.

The frontend base URL is normally `http://localhost:3001/api/v1`. Every protected request uses `Authorization: Bearer <accessToken>`. JSON responses use `{ data, meta: { requestId } }`; errors use `{ error: { code, message, details? }, meta }`.

See [docs/frontend-api-integration.md](docs/frontend-api-integration.md) for endpoint groups, payloads, and the recommended frontend flow.

## Validation

- `npm run db:validate`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:auth`
- `npm run smoke:verification`
- `npm run smoke:business`
- `npm run smoke:branch`
- `npm run smoke:order-flow`

Smoke commands expect the API on port 3001 and PostgreSQL from `DATABASE_URL`. They use unique fixtures and soft-close audited users/businesses so append-only history remains valid.

## Production integration seams

`NOTIFICATION_WEBHOOK_URL` receives outbox events for email, SMS, push, and other consumers. `PAYMENT_WEBHOOK_SECRET` verifies payment callbacks. `WORKER_SECRET` protects the maintenance worker endpoint. Card/wallet/bank SDK-specific redirect or hosted-checkout behavior belongs in a provider adapter; the backend already owns provider references, webhook deduplication, payment state, and refund records.
