import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
const email = `backend-smoke-${randomUUID()}@example.test`;
const password = "Smoke-test-password-123";
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function post(path, body, accessToken) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

try {
  await database.connect();

  const registered = await readData(
    await post("/api/v1/auth/register", {
      email,
      password,
      firstName: "Smoke",
    }),
    201,
  );
  const loggedIn = await readData(
    await post("/api/v1/auth/login", { email, password }),
    200,
  );
  const refreshed = await readData(
    await post("/api/v1/auth/refresh", {
      refreshToken: loggedIn.tokens.refreshToken,
    }),
    200,
  );

  await readData(
    await post("/api/v1/auth/logout", undefined, refreshed.tokens.accessToken),
    200,
  );

  const replayResponse = await post("/api/v1/auth/refresh", {
    refreshToken: loggedIn.tokens.refreshToken,
  });
  const revokedAccessResponse = await post(
    "/api/v1/auth/logout",
    undefined,
    refreshed.tokens.accessToken,
  );
  if (replayResponse.status !== 401 || revokedAccessResponse.status !== 401) {
    throw new Error(
      `Rotation/revocation checks failed (${replayResponse.status}, ${revokedAccessResponse.status}).`,
    );
  }

  console.log(
    JSON.stringify({
      register: 201,
      login: 200,
      refresh: 200,
      logout: 200,
      refreshReplayRejected: true,
      revokedAccessRejected: true,
      userIdCreated: Boolean(registered.user.id),
    }),
  );
} finally {
  if (!database._ending) {
    await database.query('DELETE FROM "User" WHERE "email" = $1', [email]);
    await database.end();
  }
}
