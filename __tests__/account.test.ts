import { describe, it, expect } from "vitest";
import { accountTools } from "../src/tools/account.js";
import { ApiClient } from "../src/client.js";

function clientReturning(body: unknown, captured?: { path?: string }) {
  const impl = (async (url: string | URL) => {
    if (captured) captured.path = new URL(String(url)).pathname;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
}

function tool(name: string) {
  const t = accountTools(
    new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k" }),
  ).find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}

describe("account tools", () => {
  it("registers get_account and list_ig_accounts as read-only", () => {
    expect(tool("get_account").config.annotations?.readOnlyHint).toBe(true);
    expect(tool("list_ig_accounts").config.annotations?.readOnlyHint).toBe(true);
  });

  it("get_account calls /me and returns the payload", async () => {
    const captured: { path?: string } = {};
    const client = clientReturning({ plan: { tier: "PRO" } }, captured);
    const t = accountTools(client).find((x) => x.name === "get_account")!;
    const r = await t.handler({});
    expect(captured.path).toBe("/api/v1/me");
    expect(r.content[0]!.text).toContain('"tier": "PRO"');
  });

  it("list_ig_accounts calls /ig-accounts", async () => {
    const captured: { path?: string } = {};
    const client = clientReturning({ accounts: [] }, captured);
    const t = accountTools(client).find((x) => x.name === "list_ig_accounts")!;
    await t.handler({});
    expect(captured.path).toBe("/api/v1/ig-accounts");
  });
});
