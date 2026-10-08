# ReplyAtlas MCP Server

<!-- mcp-name: io.github.ashishdesai0592/replyatlas -->

Manage your [ReplyAtlas](https://replyatlas.com) account from Claude, Cursor or any
[Model Context Protocol](https://modelcontextprotocol.io) client: Instagram
comment-to-DM automations, leads, analytics, conversations and broadcasts.

ReplyAtlas auto-sends an Instagram DM to anyone who comments a keyword on your
posts, Reels, Lives or story replies, using Instagram's official API. This server
lets an AI assistant run that account for you: "create an automation that DMs my
free guide to everyone who comments GUIDE", "who were my hottest leads this week?",
"export leads tagged webinar".

**Requires a ReplyAtlas plan with API access.** Create an API key in
ReplyAtlas → Settings → API Keys.

## Install

No install needed. Your MCP client runs it with `npx` (Node.js 18+).

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "replyatlas": {
      "command": "npx",
      "args": ["-y", "replyatlas-mcp"],
      "env": { "REPLYATLAS_API_KEY": "mf_live_your_key_here" }
    }
  }
}
```

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "replyatlas": {
      "command": "npx",
      "args": ["-y", "replyatlas-mcp"],
      "env": { "REPLYATLAS_API_KEY": "mf_live_your_key_here" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add replyatlas -e REPLYATLAS_API_KEY=mf_live_your_key_here -- npx -y replyatlas-mcp
```

## Config

| Env var | Required | Default | Notes |
|---|---|---|---|
| `REPLYATLAS_API_KEY` | yes | — | Your `mf_live_…` API key. |
| `REPLYATLAS_BASE_URL` | no | `https://replyatlas.com` | Override the API host. |

On start the server calls `/api/v1/me` to check the key and exits with a clear
message if the key is invalid or the plan has no API access.

## Tools

| Area | Tools |
|---|---|
| Account | `get_account`, `list_ig_accounts` |
| Automations | `list_automations`, `get_automation`, `create_automation`, `update_automation`, `delete_automation` |
| Leads | `list_leads`, `get_lead`, `list_tags`, `tag_lead`, `export_leads` |
| Analytics | `get_dashboard`, `get_analytics`, `list_dm_logs` |
| Conversations | `list_conversations`, `reply_to_conversation` |
| Broadcasts | `list_broadcasts`, `create_broadcast`, `send_broadcast` |

### Safety

Anything that messages real people is two-step. `reply_to_conversation` and
`send_broadcast` first return a preview and a `confirmToken`; nothing is sent
until the tool is called again with that token. The server only talks to the
ReplyAtlas REST API over HTTPS with your API key. It never sees your Instagram
password or tokens.

## Development

```bash
pnpm install
pnpm test        # vitest
pnpm build       # tsup → dist/index.js
```

## Links

- Product: https://replyatlas.com
- MCP setup guide: https://replyatlas.com/integrations/mcp
- REST API docs: https://replyatlas.com/docs

## License

MIT
