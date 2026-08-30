import { describe, expect, it } from "vitest";
import { getRequestId } from "./request-id";

describe("getRequestId", () => {
  it("keeps a valid caller request ID", () => {
    expect(
      getRequestId(
        new Request("http://localhost", {
          headers: { "x-request-id": "request-123" },
        }),
      ),
    ).toBe("request-123");
  });

  it("creates an ID when none is supplied", () => {
    expect(getRequestId(new Request("http://localhost"))).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});
