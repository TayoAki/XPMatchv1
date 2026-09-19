import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "xp_session";
const PUBLIC_PATHS = new Set(["/login", "/signup", "/reset", "/api/auth/login", "/api/auth/signup", "/api/auth/reset", "/api/health", "/api/config"]);

/**
 * Optimistic auth gate: pages redirect to /login without a session cookie and API
 * routes answer 401. Real session validation happens in the route handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession && (pathname === "/login" || pathname === "/signup")) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }
  if (hasSession) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)"],
};
