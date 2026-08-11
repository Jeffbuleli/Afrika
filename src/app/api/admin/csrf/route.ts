import { NextResponse } from "next/server";
import { issueLoginCsrfToken } from "@/lib/csrf";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-info";

/** Issue a short-lived CSRF token for the admin login form. */
export async function GET(request: Request) {
  const ip = getClientIp(request) || "unknown";
  try {
    assertRateLimit(`login-csrf:${ip}`, 30, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Trop de demandes." },
        {
          status: 429,
          headers: { "Retry-After": String(err.retryAfterSec) },
        },
      );
    }
    throw err;
  }

  const token = await issueLoginCsrfToken();
  return NextResponse.json(
    { token },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
