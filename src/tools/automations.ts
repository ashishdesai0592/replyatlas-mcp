import { z } from "zod";
import type { ApiClient } from "../client.js";
import { guard, type ToolDef } from "../tool.js";

const TRIGGER = z.enum([
  "COMMENT",
  "STORY_REPLY",
  "LIVE_COMMENT",
  "AD_REFERRAL",
  "POSTBACK",
  "MENTION",
]);
const ACTION = z.enum(["TEMPLATE", "AI_REPLY"]);

// Only fields present (defined) in `args` are forwarded, so PATCH sends a
// true partial and POST lets the server apply its defaults.
function pickDefined(
  args: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (args[k] !== undefined) out[k] = args[k];
  return out;
}

const EDITABLE = [
  "name",
  "triggerType",
  "templateText",
  "includeKeywords",
  "excludeKeywords",
  "actionType",
  "dailyCap",
  "active",
];

export function automationTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "list_automations",
      config: {
        title: "List automations",
        description:
          "List comment→DM automations (paginated). Pass `cursor` from the previous response's `nextCursor` to page.",
        inputSchema: {
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.string().optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() =>
          client.get("/api/v1/automations", {
            limit: args.limit,
            cursor: args.cursor,
          }),
        ),
    },
    {
      name: "get_automation",
      config: {
        title: "Get automation",
        description: "Fetch a single automation by id.",
        inputSchema: { id: z.string().min(1) },
        annotations: { readOnlyHint: true },
      },
      handler: (args) => guard(() => client.get(`/api/v1/automations/${args.id}`)),
    },
    {
      name: "create_automation",
      config: {
        title: "Create automation",
        description:
          "Create a comment→DM automation. Required: name, igAccountId (from list_ig_accounts), triggerType, templateText. templateText supports {{handle}} and {{commentText}} tokens. Advanced/paid options are left at their server defaults.",
        inputSchema: {
          name: z.string().min(1).max(100),
          igAccountId: z.string().min(1),
          triggerType: TRIGGER,
          templateText: z.string().min(1).max(1000),
          includeKeywords: z.array(z.string()).max(50).optional(),
          excludeKeywords: z.array(z.string()).max(50).optional(),
          actionType: ACTION.optional(),
          dailyCap: z.number().int().min(1).max(100000).optional(),
        },
        annotations: { readOnlyHint: false },
      },
      handler: (args) =>
        guard(() =>
          client.post(
            "/api/v1/automations",
            pickDefined(args, [
              "name",
              "igAccountId",
              "triggerType",
              "templateText",
              "includeKeywords",
              "excludeKeywords",
              "actionType",
              "dailyCap",
            ]),
          ),
        ),
    },
    {
      name: "update_automation",
      config: {
        title: "Update automation",
        description:
          "Update fields on an existing automation. Only provided fields change. Set `active:false` to pause, `active:true` to resume.",
        inputSchema: {
          id: z.string().min(1),
          name: z.string().min(1).max(100).optional(),
          active: z.boolean().optional(),
          triggerType: TRIGGER.optional(),
          templateText: z.string().min(1).max(1000).optional(),
          includeKeywords: z.array(z.string()).max(50).optional(),
          excludeKeywords: z.array(z.string()).max(50).optional(),
          actionType: ACTION.optional(),
          dailyCap: z.number().int().min(1).max(100000).optional(),
        },
        annotations: { readOnlyHint: false },
      },
      handler: (args) =>
        guard(() =>
          client.patch(`/api/v1/automations/${args.id}`, pickDefined(args, EDITABLE)),
        ),
    },
    {
      name: "delete_automation",
      config: {
        title: "Delete automation",
        description: "Permanently delete an automation by id. This cannot be undone.",
        inputSchema: { id: z.string().min(1) },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      handler: (args) => guard(() => client.del(`/api/v1/automations/${args.id}`)),
    },
  ];
}
