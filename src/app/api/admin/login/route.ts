import { NextResponse } from "next/server";
import { createSession, verifyAdminCredentials } from "@/lib/auth";
import { recordAdminAuth } from "@/lib/analytics";
import { getClientIp } from "@/lib/client-info";
import { assertLoginCsrf, clearLoginCsrf } from "@/lib/csrf";
import {
  clearLoginFailures,
  getLoginLockStatus,
  loginFailureDelayMs,
  recordLoginFailure,
  sleep,
} from "@/lib/login-guard";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request) || "unknown";

  try {
    // Hard cap: 5 attempts / 15 min per IP (nginx also throttles).
    assertRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        {
          status: 429,
          headers: {
            "Retry-After": String(err.retryAfterSec),
            "X-Robots-Tag": "noindex, nofollow",
          },
        },
      );
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email || "")
    .toLowerCase()
    .trim();
  const password = String(body?.password || "");
  const csrfOk = await assertLoginCsrf(body?.csrfToken);

  if (!csrfOk) {
    return NextResponse.json(
      { error: "Session de connexion expirée. Rechargez la page." },
      {
        status: 403,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      },
    );
  }

  const lock = getLoginLockStatus(ip, email || "unknown");
  if (lock.locked) {
    return NextResponse.json(
      { error: "Compte temporairement verrouillé. Réessayez plus tard." },
      {
        status: 429,
        headers: {
          "Retry-After": String(lock.retryAfterSec),
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 },
    );
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    recordLoginFailure(ip, email);
    await sleep(loginFailureDelayMs(ip));
    try {
      await recordAdminAuth({
        request,
        email,
        event: "login_failure",
      });
    } catch (err) {
      console.error("auth log failed", err);
    }
    return NextResponse.json(
      { error: "Identifiants invalides." },
      {
        status: 401,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      },
    );
  }

  clearLoginFailures(ip, email);
  await clearLoginCsrf();
  await createSession(admin);
  try {
    await recordAdminAuth({
      request,
      email: admin.email,
      event: "login_success",
    });
  } catch (err) {
    console.error("auth log failed", err);
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}
