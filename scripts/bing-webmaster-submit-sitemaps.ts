/**
 * Submit Africa Insight sitemaps to Bing Webmaster (API key from env).
 *
 *   export BING_WEBMASTER_API_KEY=...   # or BING_API_KEY
 *   npx tsx scripts/bing-webmaster-submit-sitemaps.ts
 *
 * Hub secrets often live in ~/Documents/McBuleliP2P/.env — copy Africa Insight block to Afrika ops/vps/.env for prod.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import {
  AFRICA_INSIGHT_FEEDS,
  AFRICA_INSIGHT_SITE_URL,
  getUserSites,
  submitFeed,
} from "../src/lib/bing-webmaster-api";

function loadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "ops/vps/.env"),
    path.resolve(process.cwd(), "../McBuleliP2P/.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      loadEnvFile(p);
    } catch {
      /* already loaded */
    }
  }
}

loadEnv();

async function main() {
  const sites = await getUserSites();
  console.log("verified_sites:", sites.length);
  for (const s of sites.slice(0, 10)) {
    console.log(" ", s.Url, s.IsVerified ? "verified" : "");
  }

  const siteNorm = AFRICA_INSIGHT_SITE_URL.replace(/\/$/, "") + "/";
  const hasSite = sites.some((s) =>
    (s.Url ?? "").replace(/\/$/, "").includes("africa-insight.org"),
  );
  if (!hasSite) {
    console.warn(
      "warn: africa-insight.org not in GetUserSites — check Bing property / API key account",
    );
  }

  for (const feedUrl of AFRICA_INSIGHT_FEEDS) {
    const result = await submitFeed(siteNorm, feedUrl);
    console.log(
      feedUrl,
      result.ok ? "ok" : "fail",
      result.status,
      result.raw?.slice(0, 120) ?? "",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
