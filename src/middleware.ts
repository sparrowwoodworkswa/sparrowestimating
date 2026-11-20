import { NextResponse, type NextRequest } from "next/server";

/**
 * Team-only access until real logins are added: one shared password (APP_PASSWORD) for the whole app.
 * Client proposal links (/p/...), brand images and the app's own ROM step calls stay open.
 * Locally, with no APP_PASSWORD set, the app is open. On Vercel it refuses to serve until a password is set.
 */
export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) {
    if (process.env.VERCEL) return new NextResponse("Set APP_PASSWORD in the Vercel project's environment variables, then redeploy.", { status: 503 });
    return NextResponse.next();
  }
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === pw) return NextResponse.next();
    } catch {
      /* fall through */
    }
  }
  return new NextResponse("Sign in to Sparrow Estimating. Any username, team password.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Sparrow Estimating", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/|favicon|brand/|p/|api/runs/step).*)"],
};
