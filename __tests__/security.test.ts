// Model-supplied ids end up in REST paths, and the confirm gate is the only
// thing between a prompt-injected model and a DM blast. Pin both defenses.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiClient } from "../src/client.js";
import { allTools } from "../src/tools/index.js";
import { computeConfirmToken } from "../src/confirm.js";
import { idSchema, pathId } from "../src/tool.js";

function capturing() {
  const calls: Array<{ method: string; path: string }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    const u = new URL(String(url));
    calls.push({ method: init.method ?? "GET", path: u.pathname + u.search });
    return new Response(JSON.stringify({ targeted: 1, eligible: 1, skipped: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

const HOSTILE = ["../broadcasts/b1/send?", "b1/../../me", "x?y=1", "a#b", "a b", "a/b", "", "%2e%2e"];

describe("path ids", () => {
  it.each(HOSTILE)("idSchema rejects %j", (id) => {
    expect(idSchema.safeParse(id).success).toBe(false);
  });

  it("accepts cuid and uuid style ids", () => {
    for (const id of ["ckx9a8b7c0000abcd1234efgh", "3f2b8c1e-9d4a-4b7e-8f1a-2c3d4e5f6a7b"]) {
      expect(idSchema.safeParse(id).success).toBe(true);
      expect(pathId(id)).toBe(id);
    }
  });

  it.each(HOSTILE)("pathId throws on %j even without the schema", (id) => {
    expect(() => pathId(id)).toThrow(/Invalid id/);
  });

  it("every id-taking tool validates its ids with the strict schema", () => {
    const { client } = capturing();
    for (const t of allTools(client)) {
      const shape = z.object(t.config.inputSchema);
      for (const key of ["id", "broadcastId", "tagId"]) {
        if (!(key in t.config.inputSchema)) continue;
        const r = shape.safeParse({ [key]: "../broadcasts/b1/send?" });
        expect(r.success, `${t.name}.${key}`).toBe(false);
      }
    }
  });

  it("a traversal id passed straight to a handler never reaches the network", async () => {
    const { client, calls } = capturing();
    const tagLead = allTools(client).find((t) => t.name === "tag_lead")!;
    await expect(
      tagLead.handler({ id: "../broadcasts/b1/send?", tagId: "t1" }),
    ).rejects.toThrow(/Invalid id/);
    expect(calls).toEqual([]);
  });

  it("the client refuses paths outside /api/v1 or with traversal/query", async () => {
    const { client, calls } = capturing();
    for (const p of ["/api/v1/../admin", "/admin", "/api/v1/x?y", "/api/v1/x#y"]) {
      await expect(client.get(p)).rejects.toThrow(/invalid API path/);
    }
    expect(calls).toEqual([]);
  });
});

describe("confirm tokens", () => {
  it("cannot be precomputed from the payload alone", () => {
    const payload = { broadcastId: "b1" };
    const plain = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    expect(computeConfirmToken(payload)).not.toBe(plain.slice(0, 16));
    expect(computeConfirmToken(payload)).not.toBe(plain.slice(0, 32));
  });

  it("send_broadcast with a guessed token only previews", async () => {
    const { client, calls } = capturing();
    const send = allTools(client).find((t) => t.name === "send_broadcast")!;
    const guessed = createHash("sha256").update('{"broadcastId":"b1"}').digest("hex").slice(0, 16);
    await send.handler({ broadcastId: "b1", confirmToken: guessed });
    expect(calls.map((c) => c.path)).toEqual(["/api/v1/broadcasts/b1/preview"]);
  });
});
