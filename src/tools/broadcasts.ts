import { z } from "zod";
import type { ApiClient } from "../client.js";
import { guard, ok, idSchema, pathId, type ToolDef } from "../tool.js";
import { computeConfirmToken } from "../confirm.js";

export function broadcastTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "list_broadcasts",
      config: {
        title: "List broadcasts",
        description: "List the account's broadcasts (newest first). Requires the Pro plan (BROADCAST).",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      handler: () => guard(() => client.get("/api/v1/broadcasts")),
    },
    {
      name: "create_broadcast",
      config: {
        title: "Create broadcast (draft)",
        description:
          "Create a DRAFT broadcast (does NOT send). Provide exactly one audience: `segmentId` (a saved segment) OR `filter` (an inline lead filter object, e.g. {minScore:50}). format defaults to TEXT. Use send_broadcast to send it.",
        inputSchema: {
          name: z.string().min(1).max(100),
          igAccountId: z.string().min(1),
          templateText: z.string().min(1).max(1000),
          format: z.enum(["TEXT", "MEDIA"]).optional(),
          segmentId: z.string().optional(),
          filter: z.record(z.unknown()).optional(),
          mediaAssetIds: z.array(z.string()).max(10).optional(),
        },
        annotations: { readOnlyHint: false },
      },
      handler: (args) => {
        const body: Record<string, unknown> = {
          name: args.name,
          igAccountId: args.igAccountId,
          templateText: args.templateText,
        };
        if (args.format !== undefined) body.format = args.format;
        if (args.segmentId !== undefined) body.segmentId = args.segmentId;
        if (args.filter !== undefined) body.filter = args.filter;
        if (args.mediaAssetIds !== undefined) body.mediaAssetIds = args.mediaAssetIds;
        return guard(() => client.post("/api/v1/broadcasts", body));
      },
    },
    {
      name: "send_broadcast",
      config: {
        title: "Send a broadcast",
        description:
          "Send a DRAFT broadcast to its audience. SAFETY: call once with {broadcastId} to preview the recipient counts and get a confirmToken; call again with the same broadcastId AND confirmToken to actually send. Requires the Pro plan.",
        inputSchema: {
          broadcastId: idSchema,
          confirmToken: z
            .string()
            .optional()
            .describe("Echo the confirmToken from the preview to send."),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      handler: async (args) => {
        const broadcastId = args.broadcastId as string;
        // Token hashes only broadcastId: message + audience live server-side, so
        // the id is the only client-supplied input to fingerprint for the confirm gate.
        const token = computeConfirmToken({ broadcastId });
        // Always resolve the current audience first (cheap, and keeps the
        // preview shown to the human accurate).
        try {
          const preview = await client.post<{
            targeted: number;
            eligible: number;
            skipped: number;
          }>(`/api/v1/broadcasts/${pathId(broadcastId)}/preview`);
          if (args.confirmToken !== token) {
            return ok({
              preview,
              confirmToken: token,
              next: "Call send_broadcast again with this confirmToken to send.",
            });
          }
          const result = await client.post(`/api/v1/broadcasts/${pathId(broadcastId)}/send`);
          return ok({ sent: true, preview, result });
        } catch (e) {
          return guard(async () => {
            throw e;
          });
        }
      },
    },
  ];
}
