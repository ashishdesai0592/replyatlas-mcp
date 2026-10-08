import { z } from "zod";
import type { ApiClient } from "../client.js";
import { guard, type ToolDef } from "../tool.js";

export function analyticsTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "get_dashboard",
      config: {
        title: "Get dashboard",
        description:
          "Dashboard snapshot (DMs sent, leads, conversions) for a range. range = today | 7d | 30d | cycle | custom. For custom, also pass from/to (ISO dates).",
        inputSchema: {
          range: z.enum(["today", "7d", "30d", "cycle", "custom"]).optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() =>
          client.get("/api/v1/dashboard", {
            range: args.range,
            from: args.from,
            to: args.to,
          }),
        ),
    },
    {
      name: "get_analytics",
      config: {
        title: "Get analytics",
        description:
          "Analytics breakdowns. kind = overview | timeseries | sentiment | top-automations | by-trigger | follow-unlock. range = 7d | 30d | 90d.",
        inputSchema: {
          kind: z
            .enum([
              "overview",
              "timeseries",
              "sentiment",
              "top-automations",
              "by-trigger",
              "follow-unlock",
            ])
            .optional(),
          range: z.enum(["7d", "30d", "90d"]).optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() => client.get("/api/v1/analytics", { kind: args.kind, range: args.range })),
    },
    {
      name: "list_dm_logs",
      config: {
        title: "List DM logs",
        description:
          "List sent-DM logs (paginated). Filters: automationId, status (comma-separated: QUEUED,SENT,DELIVERED,OPENED,CLICKED,FAILED), q (search). Page with `cursor`.",
        inputSchema: {
          limit: z.number().int().min(1).max(200).optional(),
          cursor: z.string().optional(),
          automationId: z.string().optional(),
          status: z.string().optional(),
          q: z.string().optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() =>
          client.get("/api/v1/dm-logs", {
            limit: args.limit,
            cursor: args.cursor,
            automationId: args.automationId,
            status: args.status,
            q: args.q,
          }),
        ),
    },
  ];
}
