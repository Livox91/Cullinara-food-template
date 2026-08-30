import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const verificationPolicy = {
  codeDigits: 6,
  expiresInMilliseconds: 10 * 60 * 1_000,
  resendAfterMilliseconds: 60 * 1_000,
  maximumAttempts: 5,
} as const;

export function generateVerificationCode(): string {
  return randomInt(0, 10 ** verificationPolicy.codeDigits)
    .toString()
    .padStart(verificationPolicy.codeDigits, "0");
}

export function hashVerificationCode(
  challengeId: string,
  code: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`identity-verification:${challengeId}:${code}`, "utf8")
    .digest("hex");
}

export function verificationCodeMatches(
  expectedHash: string,
  candidateHash: string,
): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  return (
    expected.length === candidate.length && timingSafeEqual(expected, candidate)
  );
}
