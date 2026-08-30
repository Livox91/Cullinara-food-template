import "server-only";
import { jwtVerify } from "jose";
import { z } from "zod";
import { getEnvironment } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { UnauthorizedError } from "@/server/http/errors";

const AccessTokenClaims = z.object({
  sub: z.string().uuid(),
  sid: z.string().min(1),
  type: z.literal("access"),
});

export interface Principal {
  userId: string;
  sessionId: string;
}

export async function requirePrincipal(request: Request): Promise<Principal> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError();

  try {
    const environment = getEnvironment();
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(environment.AUTH_JWT_SECRET),
      {
        issuer: environment.AUTH_ISSUER,
        audience: environment.AUTH_AUDIENCE,
        algorithms: ["HS256"],
      },
    );
    const claims = AccessTokenClaims.parse(verified.payload);
    const session = await getPrisma().authSession.findFirst({
      where: {
        id: claims.sid,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!session)
      throw new UnauthorizedError("The session is no longer active.");
    return { userId: claims.sub, sessionId: claims.sid };
  } catch {
    throw new UnauthorizedError("The access token is invalid or expired.");
  }
}
