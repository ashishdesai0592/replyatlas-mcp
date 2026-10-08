import type { ApiClient } from "../client.js";
import { guard, type ToolDef } from "../tool.js";

export function accountTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "get_account",
      config: {
        title: "Get account",
        description:
          "Return the authenticated ReplyAtlas account: profile, plan tier, DM quota/usage, and feature flags.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      handler: () => guard(() => client.get("/api/v1/me")),
    },
    {
      name: "list_ig_accounts",
      config: {
        title: "List Instagram accounts",
        description:
          "List the connected Instagram accounts (id, handle, followers). Use an id as `igAccountId` when creating automations or broadcasts.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      handler: () => guard(() => client.get("/api/v1/ig-accounts")),
    },
  ];
}
