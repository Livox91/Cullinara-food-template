import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getEnvironment } from "@/server/config/env";

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_DAYS = 30;

export interface SessionTokenMaterial {
  sessionId: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSessionTokenMaterial(
  sessionId: string = randomUUID(),
): SessionTokenMaterial {
  const refreshToken = randomBytes(48).toString("base64url");
  const refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );
  return {
    sessionId,
    refreshToken,
    refreshTokenHash: hashRefreshToken(refreshToken),
    refreshTokenExpiresAt,
  };
}

export async function signAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  const environment = getEnvironment();
  return new SignJWT({ sid: sessionId, type: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(environment.AUTH_ISSUER)
    .setAudience(environment.AUTH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_SECONDS}s`)
    .sign(new TextEncoder().encode(environment.AUTH_JWT_SECRET));
}

export const tokenPolicy = {
  accessTokenExpiresInSeconds: ACCESS_TOKEN_SECONDS,
};
