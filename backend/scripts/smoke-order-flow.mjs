import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3001",
  run = randomUUID(),
  email = `flow-${run}@example.test`,
  phone = `+92${Date.now()}${Math.floor(Math.random() * 1000)}`,
  password = "Smoke-test-password-123",
  db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let userId, businessId;
async function call(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : { ...headers }),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      `${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`,
    );
  return payload.data;
}
try {
  await db.connect();
  const registration = await call("/api/v1/auth/register", {
    method: "POST",
    body: { email, phone, password, firstName: "Flow", lastName: "Tester" },
  });
  userId = registration.user.id;
  const token = registration.tokens.accessToken;
  await call("/api/v1/auth/verification/request", {
    method: "POST",
    token,
    body: { channel: "EMAIL" },
  });
  const event = (
    await db.query(
      `SELECT payload FROM "OutboxEvent" WHERE "aggregateId"=$1 AND "eventType"='IdentityVerificationRequested' ORDER BY "createdAt" DESC LIMIT 1`,
      [userId],
    )
  ).rows[0];
  await call("/api/v1/auth/verify-email", {
    method: "POST",
    token,
    body: { code: event.payload.code },
  });
  const business = await call("/api/v1/businesses", {
    method: "POST",
    token,
    body: {
      legalName: "Flow Foods Ltd",
      displayName: "Flow Foods",
      slug: `flow-${run}`,
    },
  });
  businessId = business.id;
  const branch = await call(`/api/v1/businesses/${businessId}/branches`, {
    method: "POST",
    token,
    body: {
      name: "Flow Branch",
      code: "FLOW",
      addressLine1: "1 Test Street",
      city: "Islamabad",
      latitude: 33.7,
      longitude: 73.05,
      minimumOrderAmount: 0,
      defaultPrepMinutes: 10,
    },
  });
  const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    intervals: [{ opensAt: "00:00", closesAt: "23:59" }],
  }));
  await call(`/api/v1/businesses/${businessId}/branches/${branch.id}/hours`, {
    method: "PUT",
    token,
    body: { days },
  });
  const category = await call(
    `/api/v1/businesses/${businessId}/menu/categories`,
    { method: "POST", token, body: { name: "Meals", slug: "meals" } },
  );
  const item = await call(`/api/v1/businesses/${businessId}/menu/items`, {
    method: "POST",
    token,
    body: { categoryId: category.id, name: "Smoke Burger" },
  });
  const variant = await call(
    `/api/v1/businesses/${businessId}/menu/items/${item.id}/variants`,
    {
      method: "POST",
      token,
      body: {
        sku: `SKU-${run}`,
        name: "Regular",
        basePrice: 750,
        isDefault: true,
      },
    },
  );
  const menu = await call(`/api/v1/branches/${branch.id}/menu`);
  if (menu.categories[0].items[0].variants[0].price !== "750")
    throw new Error("Public menu price mismatch");
  const cart = await call(
    `/api/v1/me/cart?branchId=${branch.id}&fulfillmentType=PICKUP`,
    { token },
  );
  const filled = await call("/api/v1/me/cart/items", {
    method: "POST",
    token,
    body: {
      cartId: cart.id,
      variantId: variant.id,
      quantity: 2,
      modifiers: [],
    },
  });
  if (filled.quote.grandTotal !== "1500")
    throw new Error(`Quote mismatch: ${filled.quote.grandTotal}`);
  const order = await call("/api/v1/checkout", {
    method: "POST",
    token,
    headers: { "idempotency-key": run },
    body: { cartId: cart.id, paymentMethod: "CASH_ON_DELIVERY" },
  });
  const replay = await call("/api/v1/checkout", {
    method: "POST",
    token,
    headers: { "idempotency-key": run },
    body: { cartId: cart.id, paymentMethod: "CASH_ON_DELIVERY" },
  });
  if (replay.publicId !== order.publicId)
    throw new Error("Checkout replay was not idempotent");
  for (const command of [
    "confirm",
    "start-preparing",
    "ready",
    "complete-pickup",
  ])
    await call(
      `/api/v1/businesses/${businessId}/branches/${branch.id}/orders/${order.publicId}/${command}`,
      { method: "POST", token },
    );
  const completed = await call(`/api/v1/me/orders/${order.publicId}`, {
    token,
  });
  if (completed.status !== "COMPLETED")
    throw new Error(`Order ended in ${completed.status}`);
  await call(`/api/v1/me/orders/${order.publicId}/review`, {
    method: "POST",
    token,
    body: { foodRating: 5, comment: "Smoke verified" },
  });
  await call("/api/v1/rider/me/enroll", {
    method: "POST",
    token,
    body: { vehicleType: "BIKE", vehiclePlate: "SMOKE-1" },
  });
  await call("/api/v1/rider/me/status", {
    method: "PUT",
    token,
    body: { status: "AVAILABLE" },
  });
  await call("/api/v1/rider/me/location", {
    method: "POST",
    token,
    body: { latitude: 33.7, longitude: 73.05 },
  });
  const address = await call("/api/v1/me/addresses", {
    method: "POST",
    token,
    body: {
      label: "Smoke",
      recipientName: "Flow Tester",
      phone,
      addressLine1: "2 Test Street",
      city: "Islamabad",
      latitude: 33.701,
      longitude: 73.051,
      isDefault: true,
    },
  });
  const deliveryCart = await call(
    `/api/v1/me/cart?branchId=${branch.id}&fulfillmentType=DELIVERY`,
    { token },
  );
  await call("/api/v1/me/cart/address", {
    method: "PUT",
    token,
    body: { cartId: deliveryCart.id, addressId: address.id },
  });
  await call("/api/v1/me/cart/items", {
    method: "POST",
    token,
    body: {
      cartId: deliveryCart.id,
      variantId: variant.id,
      quantity: 1,
      modifiers: [],
    },
  });
  const deliveryOrder = await call("/api/v1/checkout", {
    method: "POST",
    token,
    headers: { "idempotency-key": `${run}-delivery` },
    body: { cartId: deliveryCart.id, paymentMethod: "CASH_ON_DELIVERY" },
  });
  for (const command of ["confirm", "start-preparing", "ready"])
    await call(
      `/api/v1/businesses/${businessId}/branches/${branch.id}/orders/${deliveryOrder.publicId}/${command}`,
      { method: "POST", token },
    );
  const offers = await call("/api/v1/rider/offers", { token });
  if (!offers.length) throw new Error("No rider offer was created");
  await call(`/api/v1/rider/offers/${offers[0].id}/accept`, {
    method: "POST",
    token,
  });
  await call(`/api/v1/rider/assignments/${offers[0].id}/picked-up`, {
    method: "POST",
    token,
  });
  await call(`/api/v1/rider/assignments/${offers[0].id}/delivered`, {
    method: "POST",
    token,
  });
  const delivered = await call(`/api/v1/me/orders/${deliveryOrder.publicId}`, {
    token,
  });
  if (
    delivered.status !== "COMPLETED" ||
    delivered.paymentStatus !== "CAPTURED"
  )
    throw new Error(
      `Delivery ended in ${delivered.status}/${delivered.paymentStatus}`,
    );
  console.log(
    JSON.stringify({
      authVerified: true,
      menuPublished: true,
      cartQuoted: true,
      checkoutIdempotent: true,
      pickupCompleted: true,
      reviewCreated: true,
      riderDispatchCompleted: true,
      codCaptured: true,
      publicId: order.publicId,
    }),
  );
} finally {
  if (businessId) {
    await db.query(
      `UPDATE "BusinessMembership" SET status='REVOKED',"updatedAt"=now() WHERE "businessId"=$1`,
      [businessId],
    );
    await db.query(
      `UPDATE "Business" SET status='CLOSED',"updatedAt"=now() WHERE id=$1`,
      [businessId],
    );
  }
  if (userId) {
    await db.query(
      `UPDATE "AuthSession" SET "revokedAt"=COALESCE("revokedAt",now()),"updatedAt"=now() WHERE "userId"=$1`,
      [userId],
    );
    await db.query(
      `UPDATE "User" SET status='DELETED',"updatedAt"=now() WHERE id=$1`,
      [userId],
    );
  }
  await db.end();
}
