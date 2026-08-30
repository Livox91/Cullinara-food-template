import { describe, expect, it } from "vitest";
import {
  LoginSchema,
  RefreshSchema,
  RegisterCustomerSchema,
  RequestVerificationSchema,
  VerifyIdentitySchema,
} from "./auth.schemas";

describe("auth schemas", () => {
  it("normalizes customer email registration", () => {
    const result = RegisterCustomerSchema.parse({
      email: "  USER@Example.COM ",
      password: "strong-pass-123",
    });
    expect(result.email).toBe("user@example.com");
  });

  it("requires an email or phone", () => {
    expect(() => LoginSchema.parse({ password: "strong-pass-123" })).toThrow();
  });

  it("rejects short refresh tokens", () => {
    expect(() => RefreshSchema.parse({ refreshToken: "short" })).toThrow();
  });

  it("accepts only supported identity verification channels", () => {
    expect(RequestVerificationSchema.parse({ channel: "EMAIL" })).toEqual({
      channel: "EMAIL",
    });
    expect(() =>
      RequestVerificationSchema.parse({ channel: "PUSH" }),
    ).toThrow();
  });

  it("requires an exact six-digit verification code", () => {
    expect(VerifyIdentitySchema.parse({ code: " 042731 " })).toEqual({
      code: "042731",
    });
    expect(() => VerifyIdentitySchema.parse({ code: "42731" })).toThrow();
    expect(() => VerifyIdentitySchema.parse({ code: "abcdef" })).toThrow();
  });
});
