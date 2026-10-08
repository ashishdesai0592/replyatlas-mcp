import { describe, it, expect } from "vitest";
import { computeConfirmToken } from "../src/confirm.js";

describe("computeConfirmToken", () => {
  it("is deterministic for the same payload", () => {
    expect(computeConfirmToken({ a: 1, b: "x" })).toBe(
      computeConfirmToken({ a: 1, b: "x" }),
    );
  });

  it("is independent of key order", () => {
    expect(computeConfirmToken({ a: 1, b: 2 })).toBe(
      computeConfirmToken({ b: 2, a: 1 }),
    );
  });

  it("changes when the payload changes", () => {
    expect(computeConfirmToken({ text: "hi" })).not.toBe(
      computeConfirmToken({ text: "bye" }),
    );
  });

  it("returns a short hex token", () => {
    expect(computeConfirmToken({ x: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles undefined without throwing", () => {
    const token = computeConfirmToken(undefined);
    expect(token).toMatch(/^[0-9a-f]{16}$/);
  });

  it("produces distinct tokens for null vs undefined", () => {
    expect(computeConfirmToken(null)).not.toBe(computeConfirmToken(undefined));
  });

  it("produces distinct tokens for null, NaN, Infinity, and -Infinity", () => {
    const nullToken = computeConfirmToken({ v: null });
    const nanToken = computeConfirmToken({ v: NaN });
    const infToken = computeConfirmToken({ v: Infinity });
    const negInfToken = computeConfirmToken({ v: -Infinity });

    // All should be distinct from each other
    expect(nanToken).not.toBe(nullToken);
    expect(infToken).not.toBe(nullToken);
    expect(infToken).not.toBe(nanToken);
    expect(negInfToken).not.toBe(nullToken);
    expect(negInfToken).not.toBe(nanToken);
    expect(negInfToken).not.toBe(infToken);
  });

  it("preserves array order", () => {
    expect(computeConfirmToken([1, 2])).not.toBe(computeConfirmToken([2, 1]));
  });

  it("is independent of nested key order", () => {
    expect(computeConfirmToken({ x: { a: 1, b: 2 } })).toBe(
      computeConfirmToken({ x: { b: 2, a: 1 } }),
    );
  });

  it("top-level undefined does not throw", () => {
    expect(() => computeConfirmToken(undefined)).not.toThrow();
  });
});
