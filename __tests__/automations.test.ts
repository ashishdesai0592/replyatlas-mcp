import { describe, it, expect } from "vitest";
import { automationTools } from "../src/tools/automations.js";
import { ApiClient } from "../src/client.js";

function capturing() {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    calls.push({
      method: init.method ?? "GET",
      path: new URL(String(url)).pathname + new URL(String(url)).search,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify({ items: [], automation: { id: "a1" }, ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

function pick(client: ApiClient, name: string) {
  const t = automationTools(client).find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}

describe("automation tools", () => {
  it("exposes all five tools with correct hints", () => {
    const { client } = capturing();
    const names = automationTools(client).map((t) => t.name);
    expect(names).toEqual([
      "list_automations",
      "get_automation",
      "create_automation",
      "update_automation",
      "delete_automation",
    ]);
    expect(pick(client, "list_automations").config.annotations?.readOnlyHint).toBe(true);
    expect(pick(client, "delete_automation").config.annotations?.destructiveHint).toBe(true);
  });

  it("list_automations forwards cursor + limit", async () => {
    const { client, calls } = capturing();
    await pick(client, "list_automations").handler({ limit: 10, cursor: "c1" });
    expect(calls[0]!.path).toBe("/api/v1/automations?limit=10&cursor=c1");
  });

  it("get_automation hits the id path", async () => {
    const { client, calls } = capturing();
    await pick(client, "get_automation").handler({ id: "a1" });
    expect(calls[0]!.path).toBe("/api/v1/automations/a1");
  });

  it("create_automation POSTs the required fields", async () => {
    const { client, calls } = capturing();
    await pick(client, "create_automation").handler({
      name: "Welcome",
      igAccountId: "ig1",
      triggerType: "COMMENT",
      templateText: "Hi {{handle}}",
    });
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.path).toBe("/api/v1/automations");
    expect(calls[0]!.body).toMatchObject({
      name: "Welcome",
      igAccountId: "ig1",
      triggerType: "COMMENT",
      templateText: "Hi {{handle}}",
    });
  });

  it("update_automation PATCHes only provided fields", async () => {
    const { client, calls } = capturing();
    await pick(client, "update_automation").handler({ id: "a1", active: false });
    expect(calls[0]!.method).toBe("PATCH");
    expect(calls[0]!.path).toBe("/api/v1/automations/a1");
    expect(calls[0]!.body).toEqual({ active: false });
  });

  it("delete_automation DELETEs the id path", async () => {
    const { client, calls } = capturing();
    await pick(client, "delete_automation").handler({ id: "a1" });
    expect(calls[0]!.method).toBe("DELETE");
    expect(calls[0]!.path).toBe("/api/v1/automations/a1");
  });
});
