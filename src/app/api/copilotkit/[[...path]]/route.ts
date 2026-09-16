import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { createTravelAgent } from "@/server/agent";
import { getSessionUser } from "@/server/auth";
import { PersistentAgentRunner, withCopilotUser } from "@/server/copilot-runner";

export const dynamic = "force-dynamic";

/**
 * CopilotKit v2 runtime mounted on a catch-all route. The runtime exposes
 * multi-route endpoints under /api/copilotkit (info, agent runs, connects...).
 * Live runs stream from memory; transcripts are persisted per user in Postgres
 * so reopening a chat works after deploys.
 */
const copilotRuntime = new CopilotRuntime({
  agents: { default: createTravelAgent() },
  runner: new PersistentAgentRunner(),
});

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
});

const handle = async (request: Request) => {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  return withCopilotUser(user.id, () => handler(request));
};

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
