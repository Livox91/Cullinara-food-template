import "server-only";
import { randomUUID } from "node:crypto";
import type { VerificationChannel } from "../../../../generated/prisma/client";
import { requireActiveUser } from "@/server/auth/authorization";
import type { Principal } from "@/server/auth/principal";
import { getEnvironment } from "@/server/config/env";
import { withTransaction } from "@/server/db/transaction";
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/server/http/errors";
import { authRepository } from "@/server/modules/auth/auth.repository";
import { toAuthUserDto } from "@/server/modules/auth/auth.mapper";
import type {
  LoginInput,
  RefreshInput,
  RegisterCustomerInput,
  RequestVerificationInput,
  VerifyIdentityInput,
} from "@/server/modules/auth/auth.schemas";
import type {
  AuthResult,
  TokenPair,
  VerificationRequestResult,
  VerificationResult,
} from "@/server/modules/auth/auth.types";
import {
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  verificationPolicy,
} from "@/server/modules/auth/verification-code.service";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";
import { passwordService } from "@/server/modules/auth/password.service";
import {
  createSessionTokenMaterial,
  hashRefreshToken,
  signAccessToken,
  tokenPolicy,
} from "@/server/modules/auth/token.service";

async function toTokenPair(
  userId: string,
  material: ReturnType<typeof createSessionTokenMaterial>,
): Promise<TokenPair> {
  return {
    accessToken: await signAccessToken(userId, material.sessionId),
    refreshToken: material.refreshToken,
    accessTokenExpiresInSeconds: tokenPolicy.accessTokenExpiresInSeconds,
    refreshTokenExpiresAt: material.refreshTokenExpiresAt.toISOString(),
  };
}

function identityTarget(
  identity: { email: string | null; phone: string | null },
  channel: VerificationChannel,
): string | null {
  return channel === "EMAIL" ? identity.email : identity.phone;
}

function verifiedAt(
  identity: { emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null },
  channel: VerificationChannel,
): Date | null {
  return channel === "EMAIL"
    ? identity.emailVerifiedAt
    : identity.phoneVerifiedAt;
}

function maskTarget(target: string, channel: VerificationChannel): string {
  if (channel === "EMAIL") {
    const [local, domain] = target.split("@");
    return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
  }
  return `${"*".repeat(Math.max(0, target.length - 4))}${target.slice(-4)}`;
}

export const authService = {
  async getCurrentUser(principal: Principal) {
    await requireActiveUser(principal);
    const user = await authRepository.findUserById(principal.userId);
    if (!user) throw new NotFoundError("User");
    return toAuthUserDto(user);
  },

  async registerCustomer(input: RegisterCustomerInput): Promise<AuthResult> {
    const passwordHash = await passwordService.hash(input.password);
    const material = createSessionTokenMaterial();

    try {
      const user = await withTransaction({ actorType: "SYSTEM" }, (tx) =>
        authRepository.createCustomerWithSession(tx, input, passwordHash, {
          id: material.sessionId,
          refreshTokenHash: material.refreshTokenHash,
          expiresAt: material.refreshTokenExpiresAt,
        }),
      );

      return {
        user: toAuthUserDto(user),
        tokens: await toTokenPair(user.id, material),
      };
    } catch (error) {
      const candidate = error as { code?: string };
      if (candidate?.code === "P2002") {
        throw new ConflictError(
          "IDENTITY_ALREADY_EXISTS",
          "An account already exists for that email or phone.",
        );
      }
      throw error;
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findUserByIdentifier(input);
    const validPassword = user?.passwordHash
      ? await passwordService.verify(user.passwordHash, input.password)
      : false;

    if (!user || !validPassword || user.status !== "ACTIVE") {
      throw new UnauthorizedError("Invalid credentials.");
    }

    const material = createSessionTokenMaterial();
    await withTransaction({ actorType: "CUSTOMER", userId: user.id }, (tx) =>
      authRepository.createSession(tx, {
        id: material.sessionId,
        userId: user.id,
        refreshTokenHash: material.refreshTokenHash,
        expiresAt: material.refreshTokenExpiresAt,
      }),
    );

    return {
      user: toAuthUserDto(user),
      tokens: await toTokenPair(user.id, material),
    };
  },

  async refresh(input: RefreshInput): Promise<AuthResult> {
    const currentHash = hashRefreshToken(input.refreshToken);
    const session =
      await authRepository.findSessionByRefreshTokenHash(currentHash);

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE"
    ) {
      throw new UnauthorizedError("The refresh token is invalid or expired.");
    }

    const material = createSessionTokenMaterial(session.id);
    const rotation = await withTransaction(
      { actorType: "CUSTOMER", userId: session.userId },
      (tx) =>
        authRepository.rotateSession(tx, {
          sessionId: session.id,
          currentHash,
          nextHash: material.refreshTokenHash,
          expiresAt: material.refreshTokenExpiresAt,
        }),
    );

    if (rotation.count !== 1) {
      throw new UnauthorizedError("The refresh token has already been used.");
    }

    return {
      user: toAuthUserDto(session.user),
      tokens: await toTokenPair(session.userId, material),
    };
  },

  async logout(userId: string, sessionId: string): Promise<void> {
    await authRepository.revokeSession(userId, sessionId);
  },

  async requestVerification(
    principal: Principal,
    input: RequestVerificationInput,
    requestId: string,
  ): Promise<VerificationRequestResult> {
    await requireActiveUser(principal);
    const channel = input.channel as VerificationChannel;
    const identity = await authRepository.findVerificationIdentity(
      principal.userId,
    );
    if (!identity) throw new NotFoundError("User identity");
    const target = identityTarget(identity, channel);
    if (!target) {
      throw new ConflictError(
        "IDENTITY_TARGET_MISSING",
        `The account does not have a ${channel.toLowerCase()} to verify.`,
      );
    }
    if (verifiedAt(identity, channel)) {
      throw new ConflictError(
        "IDENTITY_ALREADY_VERIFIED",
        `The account ${channel.toLowerCase()} is already verified.`,
      );
    }

    const now = new Date();
    const latest = await authRepository.findLatestVerificationChallenge(
      principal.userId,
      channel,
    );
    const retryAt = latest
      ? latest.createdAt.getTime() + verificationPolicy.resendAfterMilliseconds
      : 0;
    if (retryAt > now.getTime()) {
      throw new AppError(
        "VERIFICATION_RATE_LIMITED",
        "Please wait before requesting another verification code.",
        429,
        { retryAfterSeconds: Math.ceil((retryAt - now.getTime()) / 1_000) },
      );
    }

    const id = randomUUID();
    const code = generateVerificationCode();
    const expiresAt = new Date(
      now.getTime() + verificationPolicy.expiresInMilliseconds,
    );
    const secretHash = hashVerificationCode(
      id,
      code,
      getEnvironment().AUTH_JWT_SECRET,
    );
    await withTransaction(
      { actorType: "CUSTOMER", userId: principal.userId },
      async (tx) => {
        await authRepository.invalidateVerificationChallenges(
          tx,
          principal.userId,
          channel,
          now,
        );
        await authRepository.createVerificationChallenge(tx, {
          id,
          userId: principal.userId,
          channel,
          target,
          secretHash,
          expiresAt,
        });
        await outboxRepository.write(tx, {
          aggregateType: "User",
          aggregateId: principal.userId,
          eventType: "IdentityVerificationRequested",
          payload: {
            challengeId: id,
            channel,
            target,
            code,
            expiresAt: expiresAt.toISOString(),
            requestId,
          },
        });
      },
    );

    return {
      channel,
      maskedTarget: maskTarget(target, channel),
      expiresAt: expiresAt.toISOString(),
      delivery: "QUEUED",
    };
  },

  async verifyIdentity(
    principal: Principal,
    channel: VerificationChannel,
    input: VerifyIdentityInput,
    requestId: string,
  ): Promise<VerificationResult> {
    await requireActiveUser(principal);
    const identity = await authRepository.findVerificationIdentity(
      principal.userId,
    );
    if (!identity) throw new NotFoundError("User identity");
    const target = identityTarget(identity, channel);
    if (!target) {
      throw new ConflictError(
        "IDENTITY_TARGET_MISSING",
        `The account does not have a ${channel.toLowerCase()} to verify.`,
      );
    }
    const existingVerifiedAt = verifiedAt(identity, channel);
    if (existingVerifiedAt)
      return { channel, verifiedAt: existingVerifiedAt.toISOString() };

    const now = new Date();
    const challenge = await authRepository.findActiveVerificationChallenge(
      principal.userId,
      channel,
      now,
    );
    if (!challenge) {
      throw new AppError(
        "VERIFICATION_CHALLENGE_INVALID",
        "Request a new verification code and try again.",
        400,
      );
    }
    const candidateHash = hashVerificationCode(
      challenge.id,
      input.code,
      getEnvironment().AUTH_JWT_SECRET,
    );
    if (!verificationCodeMatches(challenge.secretHash, candidateHash)) {
      const attempts = await authRepository.recordFailedVerificationAttempt(
        challenge.id,
        verificationPolicy.maximumAttempts,
        now,
      );
      throw new AppError(
        "VERIFICATION_CODE_INVALID",
        "The verification code is invalid.",
        400,
        {
          remainingAttempts: Math.max(
            0,
            verificationPolicy.maximumAttempts - attempts,
          ),
        },
      );
    }

    const completedAt = await withTransaction(
      { actorType: "CUSTOMER", userId: principal.userId },
      async (tx) => {
        const consumed = await authRepository.consumeVerificationChallenge(
          tx,
          challenge.id,
          verificationPolicy.maximumAttempts,
          now,
        );
        if (consumed.count !== 1) {
          throw new ConflictError(
            "VERIFICATION_CHALLENGE_USED",
            "This verification challenge is no longer available.",
          );
        }
        const updated = await authRepository.markIdentityVerified(
          tx,
          principal.userId,
          channel,
          challenge.target,
          now,
        );
        if (updated.count !== 1) {
          throw new ConflictError(
            "IDENTITY_TARGET_CHANGED",
            "The account identity changed. Request a new verification code.",
          );
        }
        await outboxRepository.write(tx, {
          aggregateType: "User",
          aggregateId: principal.userId,
          eventType: "IdentityVerified",
          payload: {
            userId: principal.userId,
            channel,
            verifiedAt: now.toISOString(),
            requestId,
          },
        });
        return now;
      },
    );

    return { channel, verifiedAt: completedAt.toISOString() };
  },
};
