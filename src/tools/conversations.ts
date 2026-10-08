import { z } from "zod";
import type { ApiClient } from "../client.js";
import { guard, ok, type ToolDef } from "../tool.js";
import { computeConfirmToken } from "../confirm.js";

export function conversationTools(client: ApiClient): ToolDef[] {
  return [
    {
      name: "list_conversations",
      config: {
        title: "List conversations",
        description:
          "List human-agent inbox conversations (paginated). Filters: igAccountId, unreadOnly. Requires a plan that includes the human-agent inbox.",
        inputSchema: {
          limit: z.number().int().min(1).max(50).optional(),
          cursor: z.string().optional(),
          igAccountId: z.string().optional(),
          unreadOnly: z.boolean().optional(),
        },
        annotations: { readOnlyHint: true },
      },
      handler: (args) =>
        guard(() =>
          client.get("/api/v1/conversations", {
            limit: args.limit,
            cursor: args.cursor,
            igAccountId: args.igAccountId,
            unreadOnly: args.unreadOnly,
          }),
        ),
    },
    {
      name: "reply_to_conversation",
      config: {
        title: "Reply to a conversation",
        description:
          "Send a DM reply in a conversation. SAFETY: call once with {id, text} to get a preview and a confirmToken; call again with the same id, text, AND confirmToken to actually send. Requires a plan that includes the human-agent inbox.",
        inputSchema: {
          id: z.string().min(1),
          text: z.string().min(1).max(1000),
          confirmToken: z
            .string()
            .optional()
            .describe("Echo the confirmToken from the preview to send."),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      handler: async (args) => {
        const payload = { id: args.id as string, text: args.text as string };
        const token = computeConfirmToken(payload);
        if (args.confirmToken !== token) {
          return ok({
            preview: {
              conversationId: payload.id,
              text: payload.text,
              action: "Will send this DM reply.",
            },
            confirmToken: token,
            next: "Call reply_to_conversation again with this confirmToken to send.",
          });
        }
        return guard(() =>
          client.post(`/api/v1/conversations/${payload.id}/reply`, { text: payload.text }),
        );
      },
    },
  ];
}
