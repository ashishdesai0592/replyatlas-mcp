import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiClient } from "./client.js";
import { loadConfig, handshake } from "./config.js";
import { allTools } from "./tools/index.js";

export const VERSION = "0.1.2";

async function main(): Promise<void> {
  const cfg = loadConfig(process.env);
  const client = new ApiClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });

  // Fail fast with an actionable message before registering tools.
  const who = await handshake(client);
  console.error(
    `[replyatlas-mcp] authenticated (plan=${who.plan}${who.email ? `, ${who.email}` : ""}) → ${cfg.baseUrl}`,
  );

  const server = new McpServer({ name: "replyatlas", version: VERSION });
  for (const t of allTools(client)) {
    server.registerTool(t.name, t.config, t.handler);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[replyatlas-mcp] ready");
}

// Only run when executed as the CLI entrypoint, not when imported by tests.
// `npx`-installed bins are symlinks, so compare realpaths rather than raw
// paths — otherwise import.meta.url (resolved) never matches argv[1] (the
// symlink) and main() silently never runs.
function isCliEntrypoint(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
