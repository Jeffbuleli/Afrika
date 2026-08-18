import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE_EN, SITE_TAGLINE_FR, absoluteUrl } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type OgCard = {
  title: string;
  kicker?: string;
  coverUrl?: string | null;
  locale?: "fr" | "en";
};

function mimeFromName(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function asDataUri(buf: Buffer, mime: string): string | null {
  if (buf.length < 80 || buf.length > 5_000_000) return null;
  if (!mime.startsWith("image/") || mime.includes("svg")) return null;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function coverDataUri(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;

  if (pathOrUrl.startsWith("/") && !pathOrUrl.startsWith("//")) {
    try {
      const local = path.join(
        process.cwd(),
        "public",
        pathOrUrl.replace(/^\/+/, ""),
      );
      const buf = await readFile(local);
      const uri = asDataUri(buf, mimeFromName(local));
      if (uri) return uri;
    } catch {
      /* remote fallback */
    }
  }

  try {
    const res = await fetch(absoluteUrl(pathOrUrl), {
      headers: { "User-Agent": "AfricaInsight-OG/1.0" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const mime = (res.headers.get("content-type") || mimeFromName(pathOrUrl)).split(
      ";",
    )[0];
    const buf = Buffer.from(await res.arrayBuffer());
    return asDataUri(buf, mime);
  } catch {
    return null;
  }
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "").trim()}…`;
}

export async function renderOgCard(card: OgCard): Promise<ImageResponse> {
  const cover = await coverDataUri(card.coverUrl);
  const tagline = card.locale === "en" ? SITE_TAGLINE_EN : SITE_TAGLINE_FR;
  const title = clip(card.title, 110);
  const kicker = clip(card.kicker || "", 48);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          backgroundColor: "#1a2b48",
          fontFamily: "sans-serif",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(18,14,10,0.28) 0%, rgba(18,14,10,0.62) 48%, rgba(18,14,10,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "1200px",
            height: "630px",
            padding: "52px 64px 48px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#b89128",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {SITE_NAME}
            </div>
            {kicker ? (
              <div
                style={{
                  display: "flex",
                  color: "#f7f4ee",
                  fontSize: 20,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {kicker}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#f7f4ee",
                fontSize: title.length > 70 ? 46 : 54,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: -1.2,
                maxWidth: 1040,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                color: "#d4c8b5",
                fontSize: 22,
              }}
            >
              {tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
