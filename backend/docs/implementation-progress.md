# Backend implementation progress

The backend foundation and application modules described by `RESTAURANT_BACKEND_IMPLEMENTATION_GUIDE_NEXTJS.md` are implemented as an API-only Next.js modular monolith. No views are included.

## Completed

- API response/error contract, request IDs, CORS, pagination, environment validation, health checks
- Prisma/PostgreSQL schema, supplied production invariants, actor-aware transactions, audit log, outbox
- Argon2id auth, JWT access tokens, rotating/revocable refresh sessions, email/phone verification
- Business ownership, staff invitations/acceptance, roles, branch access, branches and timezone-aware hours
- Menu categories, items, variants, modifier groups/options, recipes, branch availability and price overrides
- Public branch discovery, availability, menus and item details
- Customer profiles and transactional default-address management
- Carts, modifier validation, Decimal pricing, coupons and advisory coupon locking
- Idempotent checkout, immutable order snapshots, delivery validation and inventory reservation
- Customer order history/detail/cancellation and command-oriented business order lifecycle
- Ingredients, recipes and append-only purchase/waste/adjustment/transfer inventory movements
- Payment initialization, verified/deduplicated webhooks, COD capture, bounded refunds
- Rider enrollment/profile/status/location, dispatch offers, acceptance, pickup and delivery
- Customer reviews, business dashboard/reviews/audit read models
- Maintenance worker for cart/offer/idempotency/location cleanup and reliable outbox publishing
- Frontend integration contract and PostgreSQL-backed end-to-end order-flow smoke test

## External production adapters

- Set `NOTIFICATION_WEBHOOK_URL` to an email/SMS/push delivery service that consumes outbox events.
- Connect returned payment provider references to the chosen card/wallet/bank SDK. Provider success must enter through the verified webhook route.
- Schedule `POST /api/internal/workers/maintenance` with `X-Worker-Secret` from a trusted scheduler.
- Add PostGIS or a dedicated dispatch service when rider volume outgrows the initial PostgreSQL candidate selection.

## Validation status

- Prisma migration deployment: passed (including `ORDER_RESERVATION` ledger reason)
- TypeScript: passed
- Unit tests: 18/18 passed
- Branch PostgreSQL smoke workflow: passed
- Full auth/menu/cart/checkout/order/review PostgreSQL smoke workflow: passed
- Production compilation and TypeScript phases: passed; rerun `npm run build` locally to create the final deployment artifact
