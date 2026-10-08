import { z } from "zod";
import type { ApiClient } from "../client.js";
import { guard, idSchema, pathId, type ToolDef } from "../tool.js";

export function leadTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "list_leads",
      config: {
        title: "List leads",
        description:
          "List/filter leads (paginated). Filters: minScore/maxScore (0–100), sentiment (POSITIVE|NEUTRAL|NEGATIVE), converted (true|false), q (search handle/name), tag (tag id). Page with `cursor` from `nextCursor`.",
        inputSchema: {
          limit: z.number().int().min(1).max(200).optional(),
          cursor: z.string().optional(),
          minScore: z.number().int().min(0).max(100).optional(),
          maxScore: z.number().int().min(0).max(100).optional(),
          sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
          converted: z.boolean().optional(),
          q: z.string().optional(),
          tag: z.string().optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() =>
          client.get("/api/v1/leads", {
            limit: args.limit,
            cursor: args.cursor,
            minScore: args.minScore,
            maxScore: args.maxScore,
            sentiment: args.sentiment,
            converted: args.converted,
            q: args.q,
            tag: args.tag,
          }),
        ),
    },
    {
      name: "get_lead",
      config: {
        title: "Get lead",
        description: "Fetch a single lead by id (includes activity).",
        inputSchema: { id: idSchema },
        annotations: { readOnlyHint: true },
      },
      handler: (args) => guard(() => client.get(`/api/v1/leads/${pathId(args.id)}`)),
    },
    {
      name: "list_tags",
      config: {
        title: "List tags",
        description:
          "List the account's lead tags (id + name). Use a tag id with tag_lead or the list_leads `tag` filter.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      handler: () => guard(() => client.get("/api/v1/tags")),
    },
    {
      name: "tag_lead",
      config: {
        title: "Tag a lead",
        description:
          "Attach an existing tag to a lead. `tagId` must be an id from list_tags (this does not create tags).",
        inputSchema: { id: idSchema, tagId: idSchema },
        annotations: { readOnlyHint: false },
      },
      handler: (args) =>
        guard(() => client.post(`/api/v1/leads/${pathId(args.id)}/tags`, { tagId: args.tagId })),
    },
    {
      name: "export_leads",
      config: {
        title: "Export leads (CSV)",
        description: "Export all leads as CSV text.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      handler: () => guard(() => client.getText("/api/v1/leads/export")),
    },
  ];
}
