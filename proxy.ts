import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Better Auth session token cookie
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = Boolean(sessionCookie && sessionCookie.value);

  // If user is already authenticated and visits /login, redirect to /docs
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/docs", request.url));
  }

  // Allow auth API routes, files API, login page, static public files, and Next.js assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/files") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/pdf.worker") ||
    /\.(ico|svg|png|jpg|jpeg|gif|webp|mjs|js|css|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // If unauthenticated:
  if (!isAuthenticated) {
    // API endpoints should return JSON 401 rather than redirecting to HTML login page
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/docs") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
