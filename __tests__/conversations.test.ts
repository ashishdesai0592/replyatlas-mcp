import { describe, it, expect } from "vitest";
import { conversationTools } from "../src/tools/conversations.js";
import { computeConfirmToken } from "../src/confirm.js";
import { ApiClient } from "../src/client.js";

function capturing() {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    const u = new URL(String(url));
    calls.push({
      method: init.method ?? "GET",
      path: u.pathname + u.search,
      body: init.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify({ ok: true, items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  const client = new ApiClient({ baseUrl: "https://replyatlas.com", apiKey: "k", fetchImpl: impl });
  return { client, calls };
}

function pick(client: ApiClient, name: string) {
  const t = conversationTools(client).find((x) => x.name === name)!;
  if (!t) throw new Error(name);
  return t;
}

describe("conversation tools", () => {
  it("reply_to_conversation is annotated destructive", () => {
    const { client } = capturing();
    expect(pick(client, "reply_to_conversation").config.annotations?.destructiveHint).toBe(true);
  });

  it("first reply call returns a preview + token and does NOT send", async () => {
    const { client, calls } = capturing();
    const r = await pick(client, "reply_to_conversation").handler({
      id: "c1",
      text: "hello there",
    });
    expect(calls.length).toBe(0); // nothing sent
    expect(r.content[0]!.text).toContain("confirmToken");
    expect(r.content[0]!.text).toContain(computeConfirmToken({ id: "c1", text: "hello there" }));
  });

  it("reply with a matching token sends", async () => {
    const { client, calls } = capturing();
    const token = computeConfirmToken({ id: "c1", text: "hello there" });
    await pick(client, "reply_to_conversation").handler({
      id: "c1",
      text: "hello there",
      confirmToken: token,
    });
    expect(calls.length).toBe(1);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.path).toBe("/api/v1/conversations/c1/reply");
    expect(calls[0]!.body).toEqual({ text: "hello there" });
  });

  it("reply with a stale token re-previews instead of sending", async () => {
    const { client, calls } = capturing();
    const staleToken = computeConfirmToken({ id: "c1", text: "OLD text" });
    const r = await pick(client, "reply_to_conversation").handler({
      id: "c1",
      text: "NEW text",
      confirmToken: staleToken,
    });
    expect(calls.length).toBe(0);
    expect(r.content[0]!.text).toContain(computeConfirmToken({ id: "c1", text: "NEW text" }));
  });
});
