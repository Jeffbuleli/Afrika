/**
 * Bing Webmaster Tools API (API key per user — all verified sites).
 * @see https://learn.microsoft.com/en-us/bingwebmaster/getting-access
 */
const BING_WEBMASTER_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

export function bingWebmasterApiKey(): string | null {
  const key =
    process.env.BING_WEBMASTER_API_KEY?.trim() ||
    process.env.BING_API_KEY?.trim();
  return key || null;
}

export type BingUserSite = {
  Url?: string;
  IsVerified?: boolean;
};

async function bingJson<T>(
  method: string,
  params: Record<string, string>,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; raw?: string }> {
  const apikey = bingWebmasterApiKey();
  if (!apikey) {
    return { ok: false, status: 0, raw: "missing_api_key" };
  }
  const qs = new URLSearchParams({ apikey, ...params });
  const url = `${BING_WEBMASTER_BASE}/${method}?${qs.toString()}`;
  const res = await fetch(url, {
    method: body !== undefined ? "POST" : "GET",
    headers:
      body !== undefined
        ? { "Content-Type": "application/json; charset=utf-8" }
        : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, raw: text.slice(0, 500) };
  }
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: true, status: res.status, raw: text };
  }
}

export async function getUserSites(): Promise<BingUserSite[]> {
  const result = await bingJson<{ d?: BingUserSite[] }>("GetUserSites", {});
  const list = result.data?.d;
  return Array.isArray(list) ? list : [];
}

export async function submitFeed(siteUrl: string, feedUrl: string) {
  return bingJson("SubmitFeed", {}, { siteUrl, feedUrl });
}

export const AFRICA_INSIGHT_SITE_URL = "https://www.africa-insight.org/";

export const AFRICA_INSIGHT_FEEDS = [
  "https://www.africa-insight.org/sitemap.xml",
  "https://www.africa-insight.org/news-sitemap.xml",
] as const;
