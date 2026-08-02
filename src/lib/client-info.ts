export type ParsedUa = {
  browser: string;
  os: string;
  device: string;
};

export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const geoCache = new Map<string, GeoInfo>();

export function getClientIp(request: Request): string | null {
  const headers = request.headers;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  for (const value of candidates) {
    if (value && value !== "unknown") return value;
  }
  return null;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUa {
  const value = ua || "";
  let browser = "Autre";
  if (/Edg\//i.test(value)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(value)) browser = "Opera";
  else if (/Chrome\//i.test(value) && !/Chromium/i.test(value)) browser = "Chrome";
  else if (/Firefox\//i.test(value)) browser = "Firefox";
  else if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) browser = "Safari";
  else if (/SamsungBrowser/i.test(value)) browser = "Samsung Internet";

  let os = "Autre";
  if (/Windows NT/i.test(value)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(value)) os = "macOS";
  else if (/Android/i.test(value)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(value)) os = "iOS";
  else if (/Linux/i.test(value)) os = "Linux";
  else if (/CrOS/i.test(value)) os = "ChromeOS";

  const device = /Mobile|Android|iPhone|iPad|iPod/i.test(value)
    ? "Mobile"
    : /Tablet|iPad/i.test(value)
      ? "Tablette"
      : "Desktop";

  return { browser, os, device };
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /bot|crawler|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|httpclient/i.test(
    ua,
  );
}

/** Prefer Cloudflare country header; otherwise free IP lookup with cache. */
export async function lookupGeo(
  ip: string | null,
  request?: Request,
): Promise<GeoInfo> {
  const cfCountry = request?.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    return {
      country: cfCountry,
      region: null,
      city: null,
    };
  }

  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.")) {
    return { country: null, region: null, city: null };
  }

  const cached = geoCache.get(ip);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`,
      { signal: controller.signal, cache: "no-store" },
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error("geo failed");
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    const info: GeoInfo =
      data.status === "success"
        ? {
            country: data.country || null,
            region: data.regionName || null,
            city: data.city || null,
          }
        : { country: null, region: null, city: null };
    geoCache.set(ip, info);
    return info;
  } catch {
    const empty = { country: null, region: null, city: null };
    geoCache.set(ip, empty);
    return empty;
  }
}

export function formatWhere(geo: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "—";
}
