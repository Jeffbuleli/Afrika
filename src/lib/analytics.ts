import { db, sqlite } from "@/db";
import { adminAuthLogs, visitLogs } from "@/db/schema";
import {
  getClientIp,
  isBotUserAgent,
  lookupGeo,
  parseUserAgent,
} from "@/lib/client-info";

export const LOG_RETENTION = 150;

export type CountBucket = { label: string; value: number };

export type VisitStats = {
  total: number;
  uniqueIps: number;
  last24h: number;
  topPages: CountBucket[];
  topCountries: CountBucket[];
  topBrowsers: CountBucket[];
  topLocales: CountBucket[];
};

export type AuthStats = {
  total: number;
  uniqueIps: number;
  loginSuccess: number;
  loginFailure: number;
  logout: number;
  topCountries: CountBucket[];
};

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

function pruneTable(table: "visit_logs" | "admin_auth_logs") {
  sqlite.exec(`
    DELETE FROM ${table}
    WHERE id NOT IN (
      SELECT id FROM ${table}
      ORDER BY datetime(created_at) DESC
      LIMIT ${LOG_RETENTION}
    )
  `);
}

function topBuckets(
  rows: Array<{ label: string | null; value: number }>,
  limit = 5,
): CountBucket[] {
  return rows
    .filter((row) => row.label)
    .slice(0, limit)
    .map((row) => ({ label: row.label as string, value: row.value }));
}

export function enforceLogRetention() {
  ensureAnalyticsSchema();
  pruneTable("visit_logs");
  pruneTable("admin_auth_logs");
}

export function getVisitStats(): VisitStats {
  ensureAnalyticsSchema();
  const total =
    (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM visit_logs")
        .get() as { c: number }
    ).c || 0;
  const uniqueIps =
    (
      sqlite
        .prepare(
          "SELECT COUNT(DISTINCT ip) AS c FROM visit_logs WHERE ip IS NOT NULL AND ip != ''",
        )
        .get() as { c: number }
    ).c || 0;
  const last24h =
    (
      sqlite
        .prepare(
          "SELECT COUNT(*) AS c FROM visit_logs WHERE datetime(created_at) >= datetime('now', '-24 hours')",
        )
        .get() as { c: number }
    ).c || 0;

  const topPages = topBuckets(
    sqlite
      .prepare(
        "SELECT path AS label, COUNT(*) AS value FROM visit_logs GROUP BY path ORDER BY value DESC LIMIT 5",
      )
      .all() as Array<{ label: string | null; value: number }>,
  );
  const topCountries = topBuckets(
    sqlite
      .prepare(
        "SELECT country AS label, COUNT(*) AS value FROM visit_logs WHERE country IS NOT NULL AND country != '' GROUP BY country ORDER BY value DESC LIMIT 5",
      )
      .all() as Array<{ label: string | null; value: number }>,
  );
  const topBrowsers = topBuckets(
    sqlite
      .prepare(
        "SELECT browser AS label, COUNT(*) AS value FROM visit_logs WHERE browser IS NOT NULL AND browser != '' GROUP BY browser ORDER BY value DESC LIMIT 5",
      )
      .all() as Array<{ label: string | null; value: number }>,
    3,
  );
  const topLocales = topBuckets(
    sqlite
      .prepare(
        "SELECT locale AS label, COUNT(*) AS value FROM visit_logs WHERE locale IS NOT NULL AND locale != '' GROUP BY locale ORDER BY value DESC LIMIT 5",
      )
      .all() as Array<{ label: string | null; value: number }>,
    3,
  );

  return {
    total,
    uniqueIps,
    last24h,
    topPages,
    topCountries,
    topBrowsers,
    topLocales,
  };
}

export function getAuthStats(): AuthStats {
  ensureAnalyticsSchema();
  const total =
    (
      sqlite
        .prepare("SELECT COUNT(*) AS c FROM admin_auth_logs")
        .get() as { c: number }
    ).c || 0;
  const uniqueIps =
    (
      sqlite
        .prepare(
          "SELECT COUNT(DISTINCT ip) AS c FROM admin_auth_logs WHERE ip IS NOT NULL AND ip != ''",
        )
        .get() as { c: number }
    ).c || 0;
  const loginSuccess =
    (
      sqlite
        .prepare(
          "SELECT COUNT(*) AS c FROM admin_auth_logs WHERE event = 'login_success'",
        )
        .get() as { c: number }
    ).c || 0;
  const loginFailure =
    (
      sqlite
        .prepare(
          "SELECT COUNT(*) AS c FROM admin_auth_logs WHERE event = 'login_failure'",
        )
        .get() as { c: number }
    ).c || 0;
  const logout =
    (
      sqlite
        .prepare(
          "SELECT COUNT(*) AS c FROM admin_auth_logs WHERE event = 'logout'",
        )
        .get() as { c: number }
    ).c || 0;
  const topCountries = topBuckets(
    sqlite
      .prepare(
        "SELECT country AS label, COUNT(*) AS value FROM admin_auth_logs WHERE country IS NOT NULL AND country != '' GROUP BY country ORDER BY value DESC LIMIT 5",
      )
      .all() as Array<{ label: string | null; value: number }>,
  );

  return {
    total,
    uniqueIps,
    loginSuccess,
    loginFailure,
    logout,
    topCountries,
  };
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
  pruneTable("visit_logs");
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
  pruneTable("admin_auth_logs");
}
