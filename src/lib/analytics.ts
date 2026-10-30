import { createHash } from "node:crypto";
import { db, sqlite } from "@/db";
import { adminAuthLogs, visitLogs } from "@/db/schema";
import {
  getClientIp,
  isBotUserAgent,
  lookupGeo,
  parseUserAgent,
} from "@/lib/client-info";
import { LOG_RETENTION } from "@/lib/log-retention";

export { LOG_RETENTION };
/** Daily rollups kept for long-term audience (admin 7 / 30 day views). */
export const AUDIENCE_RETENTION_DAYS = 90;

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

export type AudienceDayRow = {
  day: string;
  pageviews: number;
  uniques: number;
  refGoogle: number;
  refInternal: number;
  refDirect: number;
  refOther: number;
  localeFr: number;
  localeEn: number;
  pwaStandalone: number;
  pwaInstalls: number;
};

export type AudiencePeriodTotals = {
  pageviews: number;
  uniquesDistinct: number;
  refGoogle: number;
  refInternal: number;
  refDirect: number;
  refOther: number;
  pwaStandalone: number;
  pwaInstalls: number;
};

export type AudienceReport = {
  retentionDays: number;
  timezone: string;
  days: AudienceDayRow[];
  last7: AudiencePeriodTotals;
  last30: AudiencePeriodTotals;
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
    CREATE TABLE IF NOT EXISTS visit_daily_stats (
      day TEXT PRIMARY KEY,
      pageviews INTEGER NOT NULL DEFAULT 0,
      uniques INTEGER NOT NULL DEFAULT 0,
      locale_fr INTEGER NOT NULL DEFAULT 0,
      locale_en INTEGER NOT NULL DEFAULT 0,
      ref_google INTEGER NOT NULL DEFAULT 0,
      ref_internal INTEGER NOT NULL DEFAULT 0,
      ref_direct INTEGER NOT NULL DEFAULT 0,
      ref_other INTEGER NOT NULL DEFAULT 0,
      pwa_standalone INTEGER NOT NULL DEFAULT 0,
      pwa_installs INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS visit_daily_ips (
      day TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      PRIMARY KEY (day, ip_hash)
    );
    CREATE INDEX IF NOT EXISTS visit_daily_ips_day_idx ON visit_daily_ips (day);
  `);
  schemaReady = true;
}

function audienceDayKey(from = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kinshasa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
}

function dayKeyDaysAgo(n: number): string {
  const today = audienceDayKey();
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - n);
  const ys = t.getUTCFullYear();
  const ms = String(t.getUTCMonth() + 1).padStart(2, "0");
  const ds = String(t.getUTCDate()).padStart(2, "0");
  return `${ys}-${ms}-${ds}`;
}

function hashAudienceIp(ip: string | null): string | null {
  if (!ip) return null;
  const pepper =
    process.env.ANALYTICS_IP_PEPPER || "africa-insight-audience-v1";
  return createHash("sha256").update(`${pepper}:${ip}`).digest("hex").slice(0, 32);
}

export function classifyReferrer(
  referrer: string | null | undefined,
): "google" | "internal" | "direct" | "other" {
  const r = (referrer || "").trim();
  if (!r) return "direct";
  try {
    const host = new URL(r).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("africa-insight.org")) return "internal";
    return "other";
  } catch {
    return "other";
  }
}

function pruneAudienceRollups() {
  const cutoff = dayKeyDaysAgo(AUDIENCE_RETENTION_DAYS);
  sqlite.prepare("DELETE FROM visit_daily_ips WHERE day < ?").run(cutoff);
  sqlite.prepare("DELETE FROM visit_daily_stats WHERE day < ?").run(cutoff);
}

function bumpDailyAudience(input: {
  ip: string | null;
  referrer: string | null | undefined;
  locale: string | null | undefined;
  displayMode?: "standalone" | "browser" | null;
  pwaInstall?: boolean;
}) {
  const day = audienceDayKey();
  const ipHash = hashAudienceIp(input.ip);
  const ref = classifyReferrer(input.referrer);
  const locale = (input.locale || "").toLowerCase();
  const isFr = locale.startsWith("fr");
  const isEn = locale.startsWith("en");
  const standalone = input.displayMode === "standalone" ? 1 : 0;
  const install = input.pwaInstall ? 1 : 0;

  let newUnique = 0;
  if (ipHash) {
    const ins = sqlite
      .prepare(
        "INSERT OR IGNORE INTO visit_daily_ips (day, ip_hash) VALUES (?, ?)",
      )
      .run(day, ipHash);
    newUnique = ins.changes > 0 ? 1 : 0;
  }

  sqlite
    .prepare(
      `INSERT INTO visit_daily_stats (
        day, pageviews, uniques, locale_fr, locale_en,
        ref_google, ref_internal, ref_direct, ref_other,
        pwa_standalone, pwa_installs
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        pageviews = pageviews + 1,
        uniques = uniques + excluded.uniques,
        locale_fr = locale_fr + excluded.locale_fr,
        locale_en = locale_en + excluded.locale_en,
        ref_google = ref_google + excluded.ref_google,
        ref_internal = ref_internal + excluded.ref_internal,
        ref_direct = ref_direct + excluded.ref_direct,
        ref_other = ref_other + excluded.ref_other,
        pwa_standalone = pwa_standalone + excluded.pwa_standalone,
        pwa_installs = pwa_installs + excluded.pwa_installs`,
    )
    .run(
      day,
      newUnique,
      isFr ? 1 : 0,
      isEn ? 1 : 0,
      ref === "google" ? 1 : 0,
      ref === "internal" ? 1 : 0,
      ref === "direct" ? 1 : 0,
      ref === "other" ? 1 : 0,
      standalone,
      install,
    );
}

function sumPeriodTotals(cutoffDay: string): AudiencePeriodTotals {
  const row = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(pageviews), 0) AS pageviews,
        COALESCE(SUM(ref_google), 0) AS refGoogle,
        COALESCE(SUM(ref_internal), 0) AS refInternal,
        COALESCE(SUM(ref_direct), 0) AS refDirect,
        COALESCE(SUM(ref_other), 0) AS refOther,
        COALESCE(SUM(pwa_standalone), 0) AS pwaStandalone,
        COALESCE(SUM(pwa_installs), 0) AS pwaInstalls
      FROM visit_daily_stats WHERE day >= ?`,
    )
    .get(cutoffDay) as {
    pageviews: number;
    refGoogle: number;
    refInternal: number;
    refDirect: number;
    refOther: number;
    pwaStandalone: number;
    pwaInstalls: number;
  };
  const uniquesDistinct =
    (
      sqlite
        .prepare(
          "SELECT COUNT(DISTINCT ip_hash) AS c FROM visit_daily_ips WHERE day >= ?",
        )
        .get(cutoffDay) as { c: number }
    ).c || 0;

  return {
    pageviews: row.pageviews || 0,
    uniquesDistinct,
    refGoogle: row.refGoogle || 0,
    refInternal: row.refInternal || 0,
    refDirect: row.refDirect || 0,
    refOther: row.refOther || 0,
    pwaStandalone: row.pwaStandalone || 0,
    pwaInstalls: row.pwaInstalls || 0,
  };
}

export function getAudienceReport(windowDays = 30): AudienceReport {
  ensureAnalyticsSchema();
  const cutoff = dayKeyDaysAgo(windowDays);
  const rows = sqlite
    .prepare(
      `SELECT day, pageviews, uniques, locale_fr, locale_en,
        ref_google, ref_internal, ref_direct, ref_other,
        pwa_standalone, pwa_installs
      FROM visit_daily_stats WHERE day >= ? ORDER BY day DESC`,
    )
    .all(cutoff) as Array<{
    day: string;
    pageviews: number;
    uniques: number;
    locale_fr: number;
    locale_en: number;
    ref_google: number;
    ref_internal: number;
    ref_direct: number;
    ref_other: number;
    pwa_standalone: number;
    pwa_installs: number;
  }>;

  return {
    retentionDays: AUDIENCE_RETENTION_DAYS,
    timezone: "Africa/Kinshasa",
    days: rows.map((r) => ({
      day: r.day,
      pageviews: r.pageviews,
      uniques: r.uniques,
      refGoogle: r.ref_google,
      refInternal: r.ref_internal,
      refDirect: r.ref_direct,
      refOther: r.ref_other,
      localeFr: r.locale_fr,
      localeEn: r.locale_en,
      pwaStandalone: r.pwa_standalone,
      pwaInstalls: r.pwa_installs,
    })),
    last7: sumPeriodTotals(dayKeyDaysAgo(7)),
    last30: sumPeriodTotals(dayKeyDaysAgo(30)),
  };
}

export function recordPwaInstallFromRequest(request: Request) {
  ensureAnalyticsSchema();
  const ua = request.headers.get("user-agent");
  if (isBotUserAgent(ua)) return;
  const ip = getClientIp(request);
  bumpDailyAudience({ ip, referrer: null, locale: null, pwaInstall: true });
  pruneAudienceRollups();
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
  pruneAudienceRollups();
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
  displayMode?: "standalone" | "browser" | null;
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
  bumpDailyAudience({
    ip,
    referrer: input.referrer,
    locale: input.locale,
    displayMode: input.displayMode,
  });
  pruneTable("visit_logs");
  pruneAudienceRollups();
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
