import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "ai_csrf";
const CSRF_MAX_AGE = 60 * 60; // 1 hour

export async function issueLoginCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_MAX_AGE,
  });
  return token;
}

export async function assertLoginCsrf(tokenFromBody: unknown): Promise<boolean> {
  const provided = typeof tokenFromBody === "string" ? tokenFromBody.trim() : "";
  if (!provided || provided.length < 32) return false;
  const jar = await cookies();
  const expected = jar.get(CSRF_COOKIE)?.value || "";
  if (!expected || expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(provided, "utf8"),
    );
  } catch {
    return false;
  }
}

export async function clearLoginCsrf(): Promise<void> {
  const jar = await cookies();
  jar.delete(CSRF_COOKIE);
}
