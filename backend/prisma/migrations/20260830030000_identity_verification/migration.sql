-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "IdentityVerificationChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerificationChallenge_userId_channel_createdAt_idx"
ON "IdentityVerificationChallenge"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerificationChallenge_expiresAt_idx"
ON "IdentityVerificationChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "IdentityVerificationChallenge"
ADD CONSTRAINT "IdentityVerificationChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
