import { createHash } from "node:crypto";

// Stable stringify — sorts object keys recursively so token computation is
// order-independent. Arrays keep their order (order is semantically meaningful).
// Handles primitives carefully to ensure undefined, null, and non-finite numbers
// produce distinct serializations.
function stableStringify(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    // Non-finite numbers must serialize distinctly: NaN → "NaN", Infinity → "Infinity", etc.
    if (typeof value === "number" && !Number.isFinite(value)) {
      return String(value);
    }
    // Undefined must not throw and must be distinct from null.
    if (value === undefined) {
      return "undefined";
    }
    // Everything else (null, finite numbers, strings, booleans) uses JSON.stringify.
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/**
 * Compute a stable confirm token for a payload.
 * Expects JSON-serializable plain data (e.g., decoded MCP tool arguments).
 * Date and class instances are not meaningfully distinguished (collapse to {}) and should not be passed.
 */
export function computeConfirmToken(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 16);
}
