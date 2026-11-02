/**
 * IndexNow — notify Bing, Yandex, etc. when URLs change (see Bing Webmaster Tools).
 * Requires INDEXNOW_KEY + key file at https://{host}/{key}.txt
 */
import { SITE_DOMAIN } from "@/lib/site";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function indexNowKey(): string | null {
  const key =
    process.env.INDEXNOW_KEY?.trim() ||
    process.env.BING_WEBMASTER_API_KEY?.trim() ||
    process.env.BING_API_KEY?.trim();
  if (!key || key.length < 8 || key.length > 128) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(key)) return null;
  return key;
}

export function indexNowKeyFileName(): string | null {
  const key = indexNowKey();
  return key ? `${key}.txt` : null;
}

export function indexNowHost(): string {
  const fromEnv = process.env.INDEXNOW_HOST?.trim();
  if (fromEnv) return fromEnv.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  try {
    const u = new URL(
      process.env.NEXT_PUBLIC_APP_URL?.trim() || `https://${SITE_DOMAIN}`,
    );
    return u.hostname;
  } catch {
    return SITE_DOMAIN;
  }
}

export function indexNowKeyLocation(): string | null {
  const key = indexNowKey();
  if (!key) return null;
  const host = indexNowHost();
  return `https://${host}/${key}.txt`;
}

export type IndexNowResult =
  | { ok: true; status: number; urlCount: number }
  | { ok: false; reason: string; status?: number };

/** Submit up to 10_000 URLs per call (we batch smaller). */
export async function submitIndexNowUrls(
  urlList: string[],
): Promise<IndexNowResult> {
  const key = indexNowKey();
  const keyLocation = indexNowKeyLocation();
  if (!key || !keyLocation) {
    return { ok: false, reason: "indexnow_not_configured" };
  }

  const urls = [
    ...new Set(
      urlList.filter((u) => /^https:\/\//i.test(u.trim())).map((u) => u.trim()),
    ),
  ].slice(0, 100);
  if (urls.length === 0) {
    return { ok: false, reason: "empty_url_list" };
  }

  const host = indexNowHost();
  const body = JSON.stringify({
    host,
    key,
    keyLocation,
    urlList: urls,
  });

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok || res.status === 202) {
      return { ok: true, status: res.status, urlCount: urls.length };
    }
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      reason: text.slice(0, 200) || `http_${res.status}`,
      status: res.status,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch_failed";
    return { ok: false, reason: message };
  }
}
