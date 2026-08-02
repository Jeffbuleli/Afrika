import { db, sqlite } from "@/db";
import { adminAuthLogs, visitLogs } from "@/db/schema";
import {
  getClientIp,
  isBotUserAgent,
  lookupGeo,
  parseUserAgent,
} from "@/lib/client-info";

let schemaReady = false;

export function ensureAnalyticsSchema() {
  if (schemaReady) return;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS visit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      ip TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      referrer TEXT,
      locale TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_auth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      event TEXT NOT NULL,
      ip TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS visit_logs_created_idx ON visit_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS admin_auth_logs_created_idx ON admin_auth_logs (created_at DESC);
  `);
  schemaReady = true;
}

export async function recordVisit(input: {
  request: Request;
  path: string;
  locale?: string | null;
  referrer?: string | null;
}) {
  ensureAnalyticsSchema();
  const ua = input.request.headers.get("user-agent");
  if (isBotUserAgent(ua)) return;

  const path = input.path.slice(0, 500);
  if (
    !path ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/admin") ||
    path.includes(".")
  ) {
    return;
  }

  const ip = getClientIp(input.request);
  const parsed = parseUserAgent(ua);
  const geo = await lookupGeo(ip, input.request);

  await db.insert(visitLogs).values({
    path,
    method: "GET",
    ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    userAgent: ua?.slice(0, 500) || null,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    referrer: input.referrer?.slice(0, 500) || null,
    locale: input.locale || null,
  });
}

export async function recordAdminAuth(input: {
  request: Request;
  email: string;
  event: "login_success" | "login_failure" | "logout";
}) {
  ensureAnalyticsSchema();
  const ua = input.request.headers.get("user-agent");
  const ip = getClientIp(input.request);
  const parsed = parseUserAgent(ua);
  const geo = await lookupGeo(ip, input.request);

  await db.insert(adminAuthLogs).values({
    email: input.email.toLowerCase().trim().slice(0, 200) || "unknown",
    event: input.event,
    ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    userAgent: ua?.slice(0, 500) || null,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
  });
}
