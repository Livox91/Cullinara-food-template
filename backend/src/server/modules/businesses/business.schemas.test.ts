import { describe, expect, it } from "vitest";
import {
  CreateBusinessSchema,
  InviteMemberSchema,
  SetMemberBranchAccessSchema,
} from "./business.schemas";

describe("business schemas", () => {
  it("normalizes currency", () => {
    expect(
      CreateBusinessSchema.parse({
        legalName: "Acme Foods",
        displayName: "Acme",
        slug: "acme-foods",
        defaultCurrency: "pkr",
      }).defaultCurrency,
    ).toBe("PKR");
  });

  it("does not permit invitations directly into owner role", () => {
    expect(() =>
      InviteMemberSchema.parse({ email: "owner@example.test", role: "OWNER" }),
    ).toThrow();
  });

  it("deduplicates branch access", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(
      SetMemberBranchAccessSchema.parse({ branchIds: [id, id] }).branchIds,
    ).toEqual([id]);
  });
});
