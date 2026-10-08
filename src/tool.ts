import { z } from "zod";
import { ApiError } from "./client.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export interface ToolDef {
  name: string;
  config: {
    title?: string;
    description: string;
    inputSchema: z.ZodRawShape;
    annotations?: {
      readOnlyHint?: boolean;
      destructiveHint?: boolean;
      openWorldHint?: boolean;
    };
  };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

// Ids are interpolated into REST paths. Restrict them to the characters real
// ids use (cuid / uuid) so a model-supplied value like "../broadcasts/x/send?"
// can't re-target the request to another endpoint (e.g. sending a broadcast
// without the confirm step). pathId() re-checks and URL-encodes at the call
// site as a second layer, in case a handler is ever reached without the schema.
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const idSchema = z
  .string()
  .regex(ID_RE, "Invalid id: use the id exactly as returned by a list_* tool.");

export function pathId(id: unknown): string {
  if (typeof id !== "string" || !ID_RE.test(id)) {
    throw new Error("Invalid id: use the id exactly as returned by a list_* tool.");
  }
  return encodeURIComponent(id);
}

export function ok(data: unknown): ToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

export function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export async function guard(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof ApiError) return fail(e.message);
    throw e;
  }
}
