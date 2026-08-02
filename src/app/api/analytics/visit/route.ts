import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics";

export async function POST(request: Request) {
  let body: { path?: string; locale?: string; referrer?: string } | null = null;
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = text ? JSON.parse(text) : null;
    }
  } catch {
    body = null;
  }

  const path = String(body?.path || "");
  const locale = body?.locale ? String(body.locale) : null;
  const referrer = body?.referrer
    ? String(body.referrer)
    : request.headers.get("referer");

  if (!path) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordVisit({ request, path, locale, referrer });
  } catch (err) {
    console.error("visit log failed", err);
  }

  return NextResponse.json({ ok: true });
}
