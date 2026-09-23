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

/**
 * CopilotKit endpoints the app never uses and that know nothing about users: thread and memory
 * operations (list, read, clear, subscribe; keyed by thread) and the development event stream
 * (every run's events). The app keeps its own per-user chat list and transcripts. Refused outright,
 * whatever position the segment takes in the path (the runtime's router matches trailing segments).
 */
const REFUSED_SEGMENTS = new Set(["threads", "memories", "cpk-debug-events"]);

function isRefusedEndpoint(request: Request): boolean {
  return new URL(request.url).pathname.split("/").some((s) => {
    let segment = s;
    try {
      segment = decodeURIComponent(s);
    } catch {
      // Keep the raw segment.
    }
    return REFUSED_SEGMENTS.has(segment.toLowerCase());
  });
}

const handle = async (request: Request) => {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (isRefusedEndpoint(request)) return Response.json({ error: "Not found" }, { status: 404 });
  return withCopilotUser(user.id, () => handler(request));
};

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
