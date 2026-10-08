import { ApiClient, ApiError } from "./client.js";

const DEFAULT_BASE_URL = "https://replyatlas.com";

export interface MeResponse {
  user: { email: string | null; emailVerified?: boolean } | null;
  plan: { tier: string };
}

export function loadConfig(env: NodeJS.ProcessEnv): {
  baseUrl: string;
  apiKey: string;
} {
  const apiKey = env.REPLYATLAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "REPLYATLAS_API_KEY is not set. Create an API key in ReplyAtlas → Settings → API Keys (requires a plan with API access) and set it in your MCP client config.",
    );
  }
  const baseUrl = env.REPLYATLAS_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return { baseUrl, apiKey };
}

export async function handshake(
  client: ApiClient,
): Promise<{ plan: string; email: string | null }> {
  try {
    const me = await client.get<MeResponse>("/api/v1/me");
    return { plan: me.plan?.tier ?? "UNKNOWN", email: me.user?.email ?? null };
  } catch (e) {
    if (e instanceof ApiError) {
      throw new Error(`ReplyAtlas MCP could not start: ${e.message}`);
    }
    throw e;
  }
}
