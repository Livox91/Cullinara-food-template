# Frontend API integration

## Client conventions

- Base URL: `http://localhost:3001/api/v1`
- Send `Content-Type: application/json` for JSON bodies.
- Send `Authorization: Bearer <accessToken>` on customer, business, and rider routes.
- Refresh with `POST /auth/refresh` and store tokens in the frontend's secure auth mechanism. The backend does not use local storage.
- Read successful content from `payload.data`. Map `payload.error.code` for failures.
- Send a stable, unique `Idempotency-Key` for checkout and reuse it only when retrying that exact payload.
- Money and coordinates are serialized as decimal strings.

## Auth and public catalog

Auth routes are `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verification/request`, `/auth/verify-email`, and `/auth/verify-phone`.

Public routes are `GET /branches`, `/branches/:branchId`, `/branches/:branchId/availability`, `/branches/:branchId/menu`, and `/branches/:branchId/menu/items/:itemId`. The public menu already contains effective branch prices and excludes inactive, unavailable, or sold-out choices.

## Customer

Profile/address routes are `GET|PATCH /me`, `GET|POST /me/addresses`, `PATCH|DELETE /me/addresses/:id`, and `PUT /me/addresses/:id/default`.

Cart routes:

| Method       | Path                         | Main body/query                                                        |
| ------------ | ---------------------------- | ---------------------------------------------------------------------- |
| GET          | `/me/cart`                   | `?branchId=<uuid>&fulfillmentType=DELIVERY                             | PICKUP` |
| POST         | `/me/cart/items`             | `{ cartId, variantId, quantity, modifiers: [{ optionId, quantity }] }` |
| PATCH/DELETE | `/me/cart/items/:cartItemId` | item update, or no body for delete                                     |
| DELETE       | `/me/cart/items`             | `{ cartId }`                                                           |
| PUT          | `/me/cart/fulfillment`       | `{ cartId, fulfillmentType }`                                          |
| PUT          | `/me/cart/address`           | `{ cartId, addressId }`                                                |
| POST         | `/me/cart/quote`             | `{ cartId, couponCode? }`                                              |
| POST         | `/me/cart/coupon/validate`   | same as quote                                                          |

Checkout example:

```http
POST /api/v1/checkout
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json

{"cartId":"uuid","couponCode":"WELCOME20","paymentMethod":"CASH_ON_DELIVERY","scheduledFor":null,"customerNote":"Call on arrival"}
```

Orders use `GET /me/orders`, `GET /me/orders/:publicId`, `POST /me/orders/:publicId/cancel`, `GET|POST /me/orders/:publicId/payments`, and `GET|POST /me/orders/:publicId/review`.

## Business portal

Business and staff routes cover create/read/update, member listing/invitation/acceptance/role/revocation/branch access, plus `GET /businesses/:businessId/dashboard`, `/audit-logs`, and `/reviews`.

Branch routes cover list/create/read/update, order acceptance, weekly hours, and special hours. Menu administration covers categories, items, variants, modifier groups/options, item attachments, recipes, and branch price/availability overrides.

Orders list/detail under `/businesses/:businessId/branches/:branchId/orders`, with command endpoints `confirm`, `reject`, `start-preparing`, `ready`, `cancel`, and `complete-pickup`. Reject/cancel require `{ "reason": "..." }`.

Inventory includes ingredients, recipes, branch stock, purchases, waste, adjustments, and transfers. Coupons support list/create/update/disable. Payments/refunds are under `/businesses/:businessId/orders/:publicId/payments|refunds`.

## Rider and internal integration

Rider routes are `POST /rider/me/enroll`, `GET /rider/me`, status/vehicle/location/current-assignment, `GET /rider/offers`, and offer/assignment commands `accept`, `reject`, `picked-up`, and `delivered`.

- `POST /api/v1/payments/webhooks/:provider` requires `X-Webhook-Secret`.
- `POST /api/internal/workers/maintenance` requires `X-Worker-Secret` and should be scheduled outside the frontend.
