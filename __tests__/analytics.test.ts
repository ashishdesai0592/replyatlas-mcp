import { describe, it, expect } from "vitest";
import { analyticsTools } from "../src/tools/analytics.js";
import { ApiClient } from "../src/client.js";

function capturing() {
  const calls: string[] = [];
  const impl = (async (url: string | URL) => {
    const u = new URL(String(url));
    calls.push(u.pathname + u.search);
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

function pick(client: ApiClient, name: string) {
  const t = analyticsTools(client).find((x) => x.name === name)!;
  if (!t) throw new Error(name);
  return t;
}

describe("analytics tools", () => {
  it("all three are read-only", () => {
    const { client } = capturing();
    for (const t of analyticsTools(client)) {
      expect(t.config.annotations?.readOnlyHint).toBe(true);
    }
  });

  it("get_dashboard forwards range", async () => {
    const { client, calls } = capturing();
    await pick(client, "get_dashboard").handler({ range: "7d" });
    expect(calls[0]).toBe("/api/v1/dashboard?range=7d");
  });

  it("get_analytics forwards kind + range", async () => {
    const { client, calls } = capturing();
    await pick(client, "get_analytics").handler({ kind: "overview", range: "30d" });
    expect(calls[0]).toBe("/api/v1/analytics?kind=overview&range=30d");
  });

  it("list_dm_logs forwards filters", async () => {
    const { client, calls } = capturing();
    await pick(client, "list_dm_logs").handler({ limit: 50, status: "SENT" });
    expect(calls[0]).toBe("/api/v1/dm-logs?limit=50&status=SENT");
  });
});
