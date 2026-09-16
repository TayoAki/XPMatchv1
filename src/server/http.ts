import type { z, ZodTypeAny } from "zod";
import { getSessionUser, type SessionUser } from "./auth";

/** Thrown by helpers to short-circuit a route with a JSON error response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers ?? {}) } });
}

/** Wraps a route handler so HttpError and validation failures become JSON responses. */
export function route<Ctx>(handler: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      console.error("[api]", request.method, new URL(request.url).pathname, err);
      return json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

/** Browser requests that change state must come from our own origin (CSRF guard). */
export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return;
    } catch {
      // fall through to rejection
    }
  }
  throw new HttpError(403, "Cross-origin request rejected");
}

export async function requireUser(request?: Request): Promise<SessionUser> {
  if (request) assertSameOrigin(request);
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}

export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request");
  }
  return parsed.data as z.output<S>;
}

export async function resolveParams<T>(ctx: { params: Promise<T> | T }): Promise<T> {
  return await ctx.params;
}
