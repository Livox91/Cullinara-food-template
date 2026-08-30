import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
const smokeId = randomUUID();
const ownerEmail = `branch-owner-${smokeId}@example.test`;
const password = "Smoke-test-password-123";
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
let connected = false;
let businessId;
let branchId;

async function request(
  path,
  { method = "GET", body, accessToken, requestName } = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      "x-request-id": `branch-smoke-${smokeId}-${requestName ?? "request"}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readData(response, expectedStatus) {
  const payload = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected ${expectedStatus}, received ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload.data;
}

try {
  await database.connect();
  connected = true;
  const owner = await readData(
    await request("/api/v1/auth/register", {
      method: "POST",
      body: { email: ownerEmail, password },
      requestName: "register",
    }),
    201,
  );
  const accessToken = owner.tokens.accessToken;

  const business = await readData(
    await request("/api/v1/businesses", {
      method: "POST",
      accessToken,
      requestName: "business-create",
      body: {
        legalName: "Branch Smoke Foods Ltd",
        displayName: "Branch Smoke Foods",
        slug: `branch-smoke-${smokeId}`,
      },
    }),
    201,
  );
  businessId = business.id;

  const branch = await readData(
    await request(`/api/v1/businesses/${businessId}/branches`, {
      method: "POST",
      accessToken,
      requestName: "create",
      body: {
        name: "F-7 Smoke Branch",
        code: "F7-SMOKE",
        phone: "+92512650000",
        addressLine1: "Jinnah Super Market",
        city: "Islamabad",
        province: "ICT",
        latitude: 33.7215,
        longitude: 73.0433,
        minimumOrderAmount: "500.00",
        deliveryRadiusKm: "8.50",
        defaultPrepMinutes: 20,
      },
    }),
    201,
  );
  branchId = branch.id;

  const updated = await readData(
    await request(`/api/v1/businesses/${businessId}/branches/${branchId}`, {
      method: "PATCH",
      accessToken,
      requestName: "update",
      body: { name: "F-7 Updated Smoke Branch" },
    }),
    200,
  );
  const paused = await readData(
    await request(
      `/api/v1/businesses/${businessId}/branches/${branchId}/order-acceptance`,
      {
        method: "PUT",
        accessToken,
        requestName: "pause",
        body: { isAcceptingOrders: false },
      },
    ),
    200,
  );

  const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: dayOfWeek === 0,
    intervals: dayOfWeek === 0 ? [] : [{ opensAt: "11:00", closesAt: "02:00" }],
  }));
  await readData(
    await request(
      `/api/v1/businesses/${businessId}/branches/${branchId}/hours`,
      {
        method: "PUT",
        accessToken,
        requestName: "hours",
        body: { days },
      },
    ),
    200,
  );
  await readData(
    await request(
      `/api/v1/businesses/${businessId}/branches/${branchId}/special-hours`,
      {
        method: "PUT",
        accessToken,
        requestName: "special-hours",
        body: {
          date: "2026-09-06",
          note: "Defence Day",
          isClosed: false,
          intervals: [{ opensAt: "12:00", closesAt: "01:00" }],
        },
      },
    ),
    200,
  );

  const branches = await readData(
    await request(`/api/v1/businesses/${businessId}/branches`, {
      accessToken,
      requestName: "list",
    }),
    200,
  );
  const hours = await readData(
    await request(
      `/api/v1/businesses/${businessId}/branches/${branchId}/hours`,
      {
        accessToken,
        requestName: "hours-read",
      },
    ),
    200,
  );

  const auditCount = Number(
    (
      await database.query(
        'SELECT count(*) AS count FROM "AuditLog" WHERE "requestId" LIKE $1',
        [`branch-smoke-${smokeId}-%`],
      )
    ).rows[0].count,
  );
  const outboxCount = Number(
    (
      await database.query(
        'SELECT count(*) AS count FROM "OutboxEvent" WHERE "aggregateId" = $1',
        [branchId],
      )
    ).rows[0].count,
  );

  if (
    updated.name !== "F-7 Updated Smoke Branch" ||
    paused.isAcceptingOrders !== false
  ) {
    throw new Error("Branch update or acceptance assertions failed.");
  }
  if (
    branches.length !== 1 ||
    hours.weekly.length !== 7 ||
    hours.special.length !== 1
  ) {
    throw new Error("Branch list or hours read-model assertions failed.");
  }
  if (auditCount < 5 || outboxCount < 4) {
    throw new Error(
      `Expected branch audit/outbox records, received ${auditCount}/${outboxCount}.`,
    );
  }

  console.log(
    JSON.stringify({
      branchCreated: true,
      branchUpdated: true,
      orderAcceptancePaused: true,
      weeklyHoursReplaced: true,
      specialHoursUpserted: true,
      scopedBranchListed: true,
      auditEntriesWritten: auditCount,
      outboxEventsWritten: outboxCount,
    }),
  );
} finally {
  if (connected) {
    if (branchId)
      await database.query(
        'DELETE FROM "OutboxEvent" WHERE "aggregateId" = $1',
        [branchId],
      );
    if (businessId) {
      await database.query(
        'DELETE FROM "OutboxEvent" WHERE "aggregateId" = $1',
        [businessId],
      );
      await database.query(
        'UPDATE "BusinessMembership" SET "status" = \'REVOKED\', "updatedAt" = now() WHERE "businessId" = $1',
        [businessId],
      );
      await database.query(
        'UPDATE "Business" SET "status" = \'CLOSED\', "updatedAt" = now() WHERE "id" = $1',
        [businessId],
      );
    }
    await database.query(
      'UPDATE "AuthSession" SET "revokedAt" = COALESCE("revokedAt", now()), "updatedAt" = now() WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = $1)',
      [ownerEmail],
    );
    await database.query(
      'UPDATE "User" SET "status" = \'DELETED\', "updatedAt" = now() WHERE "email" = $1',
      [ownerEmail],
    );
    await database.end();
  }
}
