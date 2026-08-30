import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
const identitySuffix = randomUUID();
const email = `verification-smoke-${identitySuffix}@example.test`;
const phone = `+92300${identitySuffix.replaceAll("-", "").slice(0, 7)}`;
const password = "Smoke-test-password-123";
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
let userId;

async function post(path, body, accessToken) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function readData(response, expectedStatus) {
  const body = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected ${expectedStatus}, received ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  return body.data;
}

async function deliveredCode(channel) {
  const result = await database.query(
    `SELECT "payload" FROM "OutboxEvent"
     WHERE "aggregateType" = 'User' AND "aggregateId" = $1
       AND "eventType" = 'IdentityVerificationRequested'
       AND "payload"->>'channel' = $2
     ORDER BY "createdAt" DESC LIMIT 1`,
    [userId, channel],
  );
  const code = result.rows[0]?.payload?.code;
  if (!code)
    throw new Error(`No queued ${channel} verification code was found.`);
  return code;
}

try {
  await database.connect();
  const registered = await readData(
    await post("/api/v1/auth/register", {
      email,
      phone,
      password,
      firstName: "Verification",
    }),
    201,
  );
  userId = registered.user.id;
  const accessToken = registered.tokens.accessToken;

  const emailRequest = await readData(
    await post(
      "/api/v1/auth/verification/request",
      { channel: "EMAIL" },
      accessToken,
    ),
    202,
  );
  const emailCode = await deliveredCode("EMAIL");
  const wrongCode = emailCode === "000000" ? "999999" : "000000";
  const wrongResponse = await post(
    "/api/v1/auth/verify-email",
    { code: wrongCode },
    accessToken,
  );
  if (wrongResponse.status !== 400)
    throw new Error(
      `Wrong email code was not rejected (${wrongResponse.status}).`,
    );

  const emailVerified = await readData(
    await post("/api/v1/auth/verify-email", { code: emailCode }, accessToken),
    200,
  );
  const idempotentEmail = await readData(
    await post("/api/v1/auth/verify-email", { code: emailCode }, accessToken),
    200,
  );
  const verifiedResend = await post(
    "/api/v1/auth/verification/request",
    { channel: "EMAIL" },
    accessToken,
  );
  if (verifiedResend.status !== 409)
    throw new Error(
      `Verified email resend was not rejected (${verifiedResend.status}).`,
    );

  await readData(
    await post(
      "/api/v1/auth/verification/request",
      { channel: "PHONE" },
      accessToken,
    ),
    202,
  );
  const throttledPhoneRequest = await post(
    "/api/v1/auth/verification/request",
    { channel: "PHONE" },
    accessToken,
  );
  if (throttledPhoneRequest.status !== 429) {
    throw new Error(
      `Phone verification resend was not throttled (${throttledPhoneRequest.status}).`,
    );
  }
  const phoneCode = await deliveredCode("PHONE");
  const phoneVerified = await readData(
    await post("/api/v1/auth/verify-phone", { code: phoneCode }, accessToken),
    200,
  );

  console.log(
    JSON.stringify({
      emailRequestQueued: emailRequest.delivery === "QUEUED",
      invalidCodeRejected: true,
      emailVerified:
        emailVerified.channel === "EMAIL" && Boolean(emailVerified.verifiedAt),
      repeatedVerificationIdempotent:
        idempotentEmail.verifiedAt === emailVerified.verifiedAt,
      verifiedResendRejected: true,
      phoneResendThrottled: true,
      phoneVerified:
        phoneVerified.channel === "PHONE" && Boolean(phoneVerified.verifiedAt),
    }),
  );
} finally {
  if (!database._ending) {
    if (userId)
      await database.query(
        'DELETE FROM "OutboxEvent" WHERE "aggregateType" = \'User\' AND "aggregateId" = $1',
        [userId],
      );
    await database.query('DELETE FROM "User" WHERE "email" = $1', [email]);
    await database.end();
  }
}
