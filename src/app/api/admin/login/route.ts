import { NextResponse } from "next/server";
import { createSession, verifyAdminCredentials } from "@/lib/auth";
import { recordAdminAuth } from "@/lib/analytics";
import { getClientIp } from "@/lib/client-info";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request) || "unknown";
  try {
    assertRateLimit(`login:${ip}`, 8, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(err.retryAfterSec) },
        },
      );
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email || "");
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 },
    );
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
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
      { status: 401 },
    );
  }

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
  return NextResponse.json({ ok: true });
}
