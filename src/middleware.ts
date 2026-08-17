import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  const first = pathname.split("/").filter(Boolean)[0];
  if (first === "en" || first === "fr") {
    requestHeaders.set("x-locale", first);
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2|css|js|xml|txt)$).*)",
  ],
};
