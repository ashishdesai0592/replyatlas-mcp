import { describe, it, expect } from "vitest";
import { ApiClient, ApiError, friendlyMessage } from "../src/client.js";

function jsonResponse(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function capturingFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("ApiClient", () => {
  it("sends the bearer token and builds the URL with query params", async () => {
    const { impl, calls } = capturingFetch(200, { ok: true });
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "mf_live_abc",
      fetchImpl: impl,
    });
    const out = await client.get<{ ok: boolean }>("/api/v1/leads", {
      limit: 10,
      converted: true,
      skip: undefined,
    });
    expect(out).toEqual({ ok: true });
    expect(calls[0]!.url).toBe(
      "https://replyatlas.com/api/v1/leads?limit=10&converted=true",
    );
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(
      "Bearer mf_live_abc",
    );
  });

  it("throws ApiError with status + code on a non-2xx response", async () => {
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: jsonResponse(402, { error: "plan_required", feature: "API_ACCESS" }),
    });
    await expect(client.get("/api/v1/leads")).rejects.toMatchObject({
      status: 402,
      code: "plan_required",
    });
    await expect(client.get("/api/v1/leads")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends a JSON body on post", async () => {
    const { impl, calls } = capturingFetch(201, { automation: { id: "a1" } });
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: impl,
    });
    await client.post("/api/v1/automations", { name: "x" });
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.body).toBe(JSON.stringify({ name: "x" }));
    expect((calls[0]!.init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("returns raw text for getText (CSV export)", async () => {
    const impl = (async () =>
      new Response("id,handle\n1,@a", {
        status: 200,
        headers: { "content-type": "text/csv" },
      })) as unknown as typeof fetch;
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: impl,
    });
    const csv = await client.getText("/api/v1/leads/export");
    expect(csv).toBe("id,handle\n1,@a");
  });

  it("sends a JSON body on patch", async () => {
    const { impl, calls } = capturingFetch(200, { automation: { id: "a1" } });
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: impl,
    });
    await client.patch("/api/v1/automations/a1", { name: "updated" });
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(calls[0]!.init.body).toBe(JSON.stringify({ name: "updated" }));
    expect((calls[0]!.init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("sends DELETE method with optional body", async () => {
    const { impl, calls } = capturingFetch(200, { success: true });
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: impl,
    });
    await client.del("/api/v1/automations/a1");
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(calls[0]!.url).toBe("https://replyatlas.com/api/v1/automations/a1");
  });
});

describe("friendlyMessage", () => {
  it.each([
    [401, "unauthorized", "Your ReplyAtlas API key is invalid or was revoked. Generate a new one in Settings → API Keys."],
    [402, "plan_required", "This action requires a ReplyAtlas plan with API access."],
    [403, "email_not_verified", "Verify your email in ReplyAtlas before using the API."],
    [404, "not_found", "Not found — check the id you passed."],
    [400, "validation_failed", "Invalid request (validation_failed)."],
    [422, "validation_failed", "Invalid request (validation_failed)."],
    [409, "duplicate", "Conflict (duplicate)."],
    [429, "rate_limited", "Rate limited by ReplyAtlas. Wait a moment and try again."],
    [500, "http_error", "ReplyAtlas API error (500). Try again shortly."],
    [503, "http_error", "ReplyAtlas API error (503). Try again shortly."],
  ])(
    "returns correct message for status %d with code %s",
    (status: number, code: string, expected: string) => {
      expect(friendlyMessage(status, code)).toBe(expected);
    },
  );
});
