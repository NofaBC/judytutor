// middleware.ts
// Lightweight edge middleware for route protection.
// Firebase Auth tokens are verified client-side (AuthProvider),
// so this middleware handles basic redirect logic for public/protected paths.
// Full token verification happens in API routes via auth-helpers.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths, API routes, and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // For protected routes (dashboard, onboarding), the AuthProvider handles
  // client-side redirect. This middleware adds a cookie-based check as a
  // fallback. The __session cookie is set client-side after login.
  // If no session cookie exists, redirect to login.
  const session = req.cookies.get("__session");
  if (!session?.value) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
