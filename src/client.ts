export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function friendlyMessage(status: number, code: string): string {
  if (status === 401) {
    return "Your ReplyAtlas API key is invalid or was revoked. Generate a new one in Settings → API Keys.";
  }
  if (status === 402) {
    return "This action requires a ReplyAtlas plan with API access.";
  }
  if (status === 403 && code === "email_not_verified") {
    return "Verify your email in ReplyAtlas before using the API.";
  }
  if (status === 404) {
    return "Not found — check the id you passed.";
  }
  if (status === 400 || status === 422) {
    return `Invalid request (${code}).`;
  }
  if (status === 409) {
    return `Conflict (${code}).`;
  }
  if (status === 429) {
    return "Rate limited by ReplyAtlas. Wait a moment and try again.";
  }
  if (status >= 500) {
    return `ReplyAtlas API error (${status}). Try again shortly.`;
  }
  return `Request failed (${status}: ${code}).`;
}

interface ClientOpts {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClientOpts) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    if (!path.startsWith("/api/v1/") || path.includes("..") || path.includes("?") || path.includes("#")) {
      throw new ApiError(400, "invalid_path", "Refusing to call an invalid API path.");
    }
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private headers(withBody: boolean): Record<string, string> {
    const h: Record<string, string> = { authorization: `Bearer ${this.apiKey}` };
    if (withBody) h["content-type"] = "application/json";
    return h;
  }

  private async parse(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async raise(res: Response): Promise<never> {
    const body = await this.parse(res);
    const code =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "http_error";
    throw new ApiError(res.status, code, friendlyMessage(res.status, code), body);
  }

  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(this.buildUrl(path, query), {
      method: "GET",
      headers: this.headers(false),
    });
    if (!res.ok) return this.raise(res);
    return (await this.parse(res)) as T;
  }

  async getText(path: string, query?: Record<string, unknown>): Promise<string> {
    const res = await this.fetchImpl(this.buildUrl(path, query), {
      method: "GET",
      headers: this.headers(false),
    });
    if (!res.ok) return this.raise(res);
    return await res.text();
  }

  private async withBody<T>(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchImpl(this.buildUrl(path), {
      method,
      headers: this.headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return this.raise(res);
    return (await this.parse(res)) as T;
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.withBody<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.withBody<T>("PATCH", path, body);
  }
  del<T>(path: string, body?: unknown): Promise<T> {
    return this.withBody<T>("DELETE", path, body);
  }
}
