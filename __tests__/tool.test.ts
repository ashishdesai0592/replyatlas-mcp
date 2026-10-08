import { describe, it, expect } from "vitest";
import { ok, fail, guard } from "../src/tool.js";
import { ApiError } from "../src/client.js";

describe("tool helpers", () => {
  it("ok serializes objects as pretty JSON text", () => {
    expect(ok({ a: 1 })).toEqual({
      content: [{ type: "text", text: JSON.stringify({ a: 1 }, null, 2) }],
    });
  });

  it("ok passes strings through unchanged", () => {
    expect(ok("hello")).toEqual({ content: [{ type: "text", text: "hello" }] });
  });

  it("fail marks the result as an error", () => {
    expect(fail("nope")).toEqual({
      content: [{ type: "text", text: "nope" }],
      isError: true,
    });
  });

  it("guard converts ApiError into a fail result", async () => {
    const r = await guard(async () => {
      throw new ApiError(402, "plan_required", "This action requires a ReplyAtlas plan with API access.");
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/plan with API access/);
  });

  it("guard returns ok on success", async () => {
    const r = await guard(async () => ({ id: "x" }));
    expect(r.isError).toBeUndefined();
    expect(r.content[0]!.text).toContain('"id": "x"');
  });

  it("guard rethrows non-ApiError", async () => {
    await expect(
      guard(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
