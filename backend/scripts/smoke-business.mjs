import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
const smokeId = randomUUID();
const ownerEmail = `business-owner-${smokeId}@example.test`;
const memberEmail = `business-member-${smokeId}@example.test`;
const password = "Smoke-test-password-123";
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
let connected = false;
let businessId;
let membershipId;

async function request(
  path,
  { method = "GET", body, accessToken, requestName } = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      "x-request-id": `business-smoke-${smokeId}-${requestName ?? "request"}`,
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
      requestName: "owner-register",
    }),
    201,
  );
  await readData(
    await request("/api/v1/auth/register", {
      method: "POST",
      body: { email: memberEmail, password },
      requestName: "member-register",
    }),
    201,
  );

  const business = await readData(
    await request("/api/v1/businesses", {
      method: "POST",
      accessToken: owner.tokens.accessToken,
      requestName: "create",
      body: {
        legalName: "Smoke Test Foods Ltd",
        displayName: "Smoke Foods",
        slug: `smoke-foods-${smokeId}`,
      },
    }),
    201,
  );
  businessId = business.id;

  const invited = await readData(
    await request(`/api/v1/businesses/${businessId}/members/invitations`, {
      method: "POST",
      accessToken: owner.tokens.accessToken,
      requestName: "invite",
      body: { email: memberEmail, role: "MANAGER" },
    }),
    201,
  );
  membershipId = invited.id;

  const roleChanged = await readData(
    await request(
      `/api/v1/businesses/${businessId}/members/${membershipId}/role`,
      {
        method: "PATCH",
        accessToken: owner.tokens.accessToken,
        requestName: "role",
        body: { role: "KITCHEN" },
      },
    ),
    200,
  );

  await readData(
    await request(
      `/api/v1/businesses/${businessId}/members/${membershipId}/branches`,
      {
        method: "PUT",
        accessToken: owner.tokens.accessToken,
        requestName: "branches",
        body: { branchIds: [] },
      },
    ),
    200,
  );

  const members = await readData(
    await request(`/api/v1/businesses/${businessId}/members`, {
      accessToken: owner.tokens.accessToken,
      requestName: "list",
    }),
    200,
  );
  const ownerMembership = members.find(
    (membership) => membership.role === "OWNER",
  );

  const selfRevoke = await request(
    `/api/v1/businesses/${businessId}/members/${ownerMembership.id}`,
    {
      method: "DELETE",
      accessToken: owner.tokens.accessToken,
      requestName: "self-revoke",
    },
  );
  if (selfRevoke.status !== 409)
    throw new Error(
      `Expected self-revocation to return 409, received ${selfRevoke.status}.`,
    );

  const revoked = await readData(
    await request(`/api/v1/businesses/${businessId}/members/${membershipId}`, {
      method: "DELETE",
      accessToken: owner.tokens.accessToken,
      requestName: "revoke",
    }),
    200,
  );

  const auditCount = Number(
    (
      await database.query(
        'SELECT count(*) AS count FROM "AuditLog" WHERE "requestId" LIKE $1',
        [`business-smoke-${smokeId}-%`],
      )
    ).rows[0].count,
  );
  const outboxCount = Number(
    (
      await database.query(
        'SELECT count(*) AS count FROM "OutboxEvent" WHERE "aggregateId" = ANY($1::text[])',
        [[businessId, membershipId]],
      )
    ).rows[0].count,
  );

  if (
    auditCount < 5 ||
    outboxCount < 3 ||
    roleChanged.role !== "KITCHEN" ||
    revoked.status !== "REVOKED"
  ) {
    throw new Error(
      "Business audit, outbox, role, or revocation assertions failed.",
    );
  }

  console.log(
    JSON.stringify({
      businessCreated: true,
      memberInvited: true,
      roleChanged: true,
      branchAccessReplaced: true,
      selfRevocationRejected: true,
      memberRevoked: true,
      auditEntriesWritten: auditCount,
      outboxEventsWritten: outboxCount,
    }),
  );
} finally {
  if (connected) {
    if (businessId || membershipId) {
      await database.query(
        'DELETE FROM "OutboxEvent" WHERE "aggregateId" = ANY($1::text[])',
        [[businessId, membershipId].filter(Boolean)],
      );
    }
    if (businessId) {
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
      'UPDATE "AuthSession" SET "revokedAt" = COALESCE("revokedAt", now()), "updatedAt" = now() WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = ANY($1::text[]))',
      [[ownerEmail, memberEmail]],
    );
    await database.query(
      'UPDATE "User" SET "status" = \'DELETED\', "updatedAt" = now() WHERE "email" = ANY($1::text[])',
      [[ownerEmail, memberEmail]],
    );
    await database.end();
  }
}
