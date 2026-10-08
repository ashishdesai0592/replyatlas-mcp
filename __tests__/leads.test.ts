import { describe, it, expect } from "vitest";
import { leadTools } from "../src/tools/leads.js";
import { ApiClient } from "../src/client.js";

function capturing(bodyOut: unknown, contentType = "application/json") {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    const u = new URL(String(url));
    calls.push({
      method: init.method ?? "GET",
      path: u.pathname + u.search,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    const payload = contentType.includes("csv") ? String(bodyOut) : JSON.stringify(bodyOut);
    return new Response(payload, { status: 200, headers: { "content-type": contentType } });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

function pick(client: ApiClient, name: string) {
  const t = leadTools(client).find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}

describe("lead tools", () => {
  it("exposes the five lead tools", () => {
    const { client } = capturing({});
    expect(leadTools(client).map((t) => t.name)).toEqual([
      "list_leads",
      "get_lead",
      "list_tags",
      "tag_lead",
      "export_leads",
    ]);
  });

  it("list_leads forwards only defined filters", async () => {
    const { client, calls } = capturing({ items: [], nextCursor: null });
    await pick(client, "list_leads").handler({ limit: 25, minScore: 80, sentiment: "POSITIVE" });
    expect(calls[0]!.path).toBe("/api/v1/leads?limit=25&minScore=80&sentiment=POSITIVE");
  });

  it("tag_lead POSTs the tagId to the lead", async () => {
    const { client, calls } = capturing({ ok: true });
    await pick(client, "tag_lead").handler({ id: "lead1", tagId: "tag1" });
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.path).toBe("/api/v1/leads/lead1/tags");
    expect(calls[0]!.body).toEqual({ tagId: "tag1" });
  });

  it("export_leads returns raw CSV text", async () => {
    const { client } = capturing("id,handle\n1,@a", "text/csv");
    const r = await pick(client, "export_leads").handler({});
    expect(r.content[0]!.text).toBe("id,handle\n1,@a");
  });
});
