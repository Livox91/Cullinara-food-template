import { describe, expect, it } from "vitest";
import {
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  verificationPolicy,
} from "./verification-code.service";

describe("verification codes", () => {
  it("generates fixed-width numeric codes", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(code).toHaveLength(verificationPolicy.codeDigits);
  });

  it("uses challenge-bound hashes and constant-time comparison", () => {
    const first = hashVerificationCode(
      "challenge-a",
      "123456",
      "a-secure-test-secret",
    );
    const same = hashVerificationCode(
      "challenge-a",
      "123456",
      "a-secure-test-secret",
    );
    const otherChallenge = hashVerificationCode(
      "challenge-b",
      "123456",
      "a-secure-test-secret",
    );
    expect(verificationCodeMatches(first, same)).toBe(true);
    expect(verificationCodeMatches(first, otherChallenge)).toBe(false);
  });
});
