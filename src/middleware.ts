import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
