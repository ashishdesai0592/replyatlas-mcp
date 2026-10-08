import { describe, it, expect } from "vitest";
import { loadConfig, handshake } from "../src/config.js";
import { ApiClient } from "../src/client.js";

function fetchReturning(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("loadConfig", () => {
  it("defaults the base URL to prod", () => {
    const cfg = loadConfig({ REPLYATLAS_API_KEY: "mf_live_x" } as NodeJS.ProcessEnv);
    expect(cfg).toEqual({ baseUrl: "https://replyatlas.com", apiKey: "mf_live_x" });
  });

  it("honors REPLYATLAS_BASE_URL override", () => {
    const cfg = loadConfig({
      REPLYATLAS_API_KEY: "k",
      REPLYATLAS_BASE_URL: "https://staging.example.com",
    } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe("https://staging.example.com");
  });

  it("throws an actionable error when the key is missing", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/REPLYATLAS_API_KEY/);
  });
});

describe("handshake", () => {
  it("returns plan + email on success", async () => {
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: fetchReturning(200, {
        user: { email: "a@b.com", emailVerified: true },
        plan: { tier: "PRO" },
      }),
    });
    await expect(handshake(client)).resolves.toEqual({ plan: "PRO", email: "a@b.com" });
  });

  it("maps a 401 to an invalid-key message", async () => {
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: fetchReturning(401, { error: "unauthorized" }),
    });
    await expect(handshake(client)).rejects.toThrow(/invalid or was revoked/);
  });

  it("maps a 402 to a plan-required message", async () => {
    const client = new ApiClient({
      baseUrl: "https://replyatlas.com",
      apiKey: "k",
      fetchImpl: fetchReturning(402, { error: "plan_required" }),
    });
    await expect(handshake(client)).rejects.toThrow(/plan with API access/);
  });
});
