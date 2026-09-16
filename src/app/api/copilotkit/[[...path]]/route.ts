import {
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { createTravelAgent } from "@/server/agent";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * CopilotKit v2 runtime mounted on a catch-all route. The runtime exposes
 * multi-route endpoints under /api/copilotkit (info, agent runs, connects...).
 * Thread history lives in the in-memory runner for the lifetime of the server.
 */
const copilotRuntime = new CopilotRuntime({
  agents: { default: createTravelAgent() },
  runner: new InMemoryAgentRunner(),
});

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
});

const handle = async (request: Request) => {
  if (!(await getSessionUser())) return Response.json({ error: "Please sign in" }, { status: 401 });
  return handler(request);
};

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
