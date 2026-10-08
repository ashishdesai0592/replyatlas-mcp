import type { ApiClient } from "../client.js";
import type { ToolDef } from "../tool.js";
import { accountTools } from "./account.js";
import { automationTools } from "./automations.js";
import { leadTools } from "./leads.js";
import { analyticsTools } from "./analytics.js";
import { conversationTools } from "./conversations.js";
import { broadcastTools } from "./broadcasts.js";

export function allTools(client: ApiClient): ToolDef[] {
  return [
    ...accountTools(client),
    ...automationTools(client),
    ...leadTools(client),
    ...analyticsTools(client),
    ...conversationTools(client),
    ...broadcastTools(client),
  ];
}
