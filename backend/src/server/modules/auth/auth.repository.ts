import "server-only";
import type { VerificationChannel } from "../../../../generated/prisma/client";
import type { PrismaTx } from "@/server/db/transaction";
import { getPrisma } from "@/server/db/prisma";
import type {
  LoginInput,
  RegisterCustomerInput,
} from "@/server/modules/auth/auth.schemas";

const authUserInclude = {
  customerProfile: { select: { firstName: true, lastName: true } },
} as const;

export const authRepository = {
  findUserById(userId: string) {
    return getPrisma().user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });
  },

  findUserByIdentifier(input: Pick<LoginInput, "email" | "phone">) {
    const identifiers = [
      input.email ? { email: input.email } : undefined,
      input.phone ? { phone: input.phone } : undefined,
    ].filter(
      (identifier): identifier is { email: string } | { phone: string } =>
        Boolean(identifier),
    );
    return getPrisma().user.findFirst({
      where: { OR: identifiers },
      include: authUserInclude,
    });
  },

  createCustomerWithSession(
    tx: PrismaTx,
    input: RegisterCustomerInput,
    passwordHash: string,
    session: { id: string; refreshTokenHash: string; expiresAt: Date },
  ) {
    return tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        customerProfile: {
          create: { firstName: input.firstName, lastName: input.lastName },
        },
        authSessions: { create: session },
      },
      include: authUserInclude,
    });
  },

  createSession(
    tx: PrismaTx,
    session: {
      id: string;
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
    },
  ) {
    return tx.authSession.create({ data: session });
  },

  findSessionByRefreshTokenHash(refreshTokenHash: string) {
    return getPrisma().authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: { include: authUserInclude } },
    });
  },

  rotateSession(
    tx: PrismaTx,
    input: {
      sessionId: string;
      currentHash: string;
      nextHash: string;
      expiresAt: Date;
    },
  ) {
    return tx.authSession.updateMany({
      where: {
        id: input.sessionId,
        refreshTokenHash: input.currentHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { refreshTokenHash: input.nextHash, expiresAt: input.expiresAt },
    });
  },

  revokeSession(userId: string, sessionId: string) {
    return getPrisma().authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  findVerificationIdentity(userId: string) {
    return getPrisma().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
  },

  findLatestVerificationChallenge(
    userId: string,
    channel: VerificationChannel,
  ) {
    return getPrisma().identityVerificationChallenge.findFirst({
      where: { userId, channel },
      orderBy: { createdAt: "desc" },
    });
  },

  findActiveVerificationChallenge(
    userId: string,
    channel: VerificationChannel,
    now: Date,
  ) {
    return getPrisma().identityVerificationChallenge.findFirst({
      where: {
        userId,
        channel,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  invalidateVerificationChallenges(
    tx: PrismaTx,
    userId: string,
    channel: VerificationChannel,
    now: Date,
  ) {
    return tx.identityVerificationChallenge.updateMany({
      where: { userId, channel, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
  },

  createVerificationChallenge(
    tx: PrismaTx,
    input: {
      id: string;
      userId: string;
      channel: VerificationChannel;
      target: string;
      secretHash: string;
      expiresAt: Date;
    },
  ) {
    return tx.identityVerificationChallenge.create({ data: input });
  },

  async recordFailedVerificationAttempt(
    challengeId: string,
    maximumAttempts: number,
    now: Date,
  ) {
    const challenge = await getPrisma().identityVerificationChallenge.update({
      where: { id: challengeId },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    if (challenge.attempts >= maximumAttempts) {
      await getPrisma().identityVerificationChallenge.updateMany({
        where: { id: challengeId, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: now },
      });
    }
    return challenge.attempts;
  },

  consumeVerificationChallenge(
    tx: PrismaTx,
    challengeId: string,
    maximumAttempts: number,
    now: Date,
  ) {
    return tx.identityVerificationChallenge.updateMany({
      where: {
        id: challengeId,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: maximumAttempts },
      },
      data: { consumedAt: now },
    });
  },

  markIdentityVerified(
    tx: PrismaTx,
    userId: string,
    channel: VerificationChannel,
    target: string,
    now: Date,
  ) {
    return channel === "EMAIL"
      ? tx.user.updateMany({
          where: { id: userId, email: target },
          data: { emailVerifiedAt: now },
        })
      : tx.user.updateMany({
          where: { id: userId, phone: target },
          data: { phoneVerifiedAt: now },
        });
  },
};
