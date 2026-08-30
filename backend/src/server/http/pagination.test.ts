import { describe, expect, it } from "vitest";
import { parsePagination } from "./pagination";

describe("parsePagination", () => {
  it("uses safe defaults", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ limit: 25 });
  });

  it("parses a cursor and bounded limit", () => {
    expect(
      parsePagination(new URLSearchParams("cursor=next-1&limit=50")),
    ).toEqual({ cursor: "next-1", limit: 50 });
  });

  it("rejects excessive page sizes", () => {
    expect(() => parsePagination(new URLSearchParams("limit=101"))).toThrow();
  });
});
