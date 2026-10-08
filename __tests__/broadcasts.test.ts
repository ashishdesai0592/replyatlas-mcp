import { describe, it, expect } from "vitest";
import { broadcastTools } from "../src/tools/broadcasts.js";
import { computeConfirmToken } from "../src/confirm.js";
import { ApiClient } from "../src/client.js";

function capturing(responder: (path: string) => unknown) {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    const u = new URL(String(url));
    const path = u.pathname;
    calls.push({
      method: init.method ?? "GET",
      path,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(responder(path)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

function pick(client: ApiClient, name: string) {
  const t = broadcastTools(client).find((x) => x.name === name)!;
  if (!t) throw new Error(name);
  return t;
}

describe("broadcast tools", () => {
  it("create_broadcast POSTs a draft with an inline filter", async () => {
    const { client, calls } = capturing(() => ({ broadcast: { id: "b1", status: "DRAFT" } }));
    await pick(client, "create_broadcast").handler({
      name: "Promo",
      igAccountId: "ig1",
      templateText: "Sale!",
      filter: { minScore: 50 },
    });
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.path).toBe("/api/v1/broadcasts");
    expect(calls[0]!.body).toMatchObject({
      name: "Promo",
      igAccountId: "ig1",
      templateText: "Sale!",
      filter: { minScore: 50 },
    });
  });

  it("send_broadcast first call previews and does NOT send", async () => {
    const { client, calls } = capturing((path) =>
      path.endsWith("/preview") ? { targeted: 100, eligible: 80, skipped: 20 } : {},
    );
    const r = await pick(client, "send_broadcast").handler({ broadcastId: "b1" });
    expect(calls.map((c) => c.path)).toEqual(["/api/v1/broadcasts/b1/preview"]);
    expect(r.content[0]!.text).toContain('"eligible": 80');
    expect(r.content[0]!.text).toContain(computeConfirmToken({ broadcastId: "b1" }));
  });

  it("send_broadcast with a matching token previews then sends", async () => {
    const { client, calls } = capturing((path) =>
      path.endsWith("/preview") ? { targeted: 5, eligible: 5, skipped: 0 } : { status: "SENDING" },
    );
    const token = computeConfirmToken({ broadcastId: "b1" });
    await pick(client, "send_broadcast").handler({ broadcastId: "b1", confirmToken: token });
    expect(calls.map((c) => c.path)).toEqual([
      "/api/v1/broadcasts/b1/preview",
      "/api/v1/broadcasts/b1/send",
    ]);
  });

  it("send_broadcast is annotated destructive", () => {
    const { client } = capturing(() => ({}));
    expect(pick(client, "send_broadcast").config.annotations?.destructiveHint).toBe(true);
  });
});
