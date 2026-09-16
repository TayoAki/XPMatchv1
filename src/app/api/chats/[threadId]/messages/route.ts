import { json, requireUser, resolveParams, route } from "@/server/http";
import { loadTranscript } from "@/server/models";

export const dynamic = "force-dynamic";

/** The stored transcript of one chat (what the runtime restores when the chat is reopened). */
export const GET = route(async (_request, ctx: { params: Promise<{ threadId: string }> }) => {
  const user = await requireUser();
  const { threadId } = await resolveParams(ctx);
  const messages = await loadTranscript(user.id, threadId);
  return json({ threadId, count: messages.length, messages });
});
