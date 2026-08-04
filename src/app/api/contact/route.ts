import { NextResponse } from "next/server";
import { z } from "zod";
import { createContactMessage } from "@/lib/contact";
import { getClientIp } from "@/lib/client-info";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isLocale } from "@/lib/i18n";

const bodySchema = z.object({
  kind: z.enum(["suggestion", "contact"]).default("contact"),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(10).max(2000),
  locale: z.string().optional(),
  // Honeypot — bots fill this; humans leave empty.
  website: z.string().max(80).optional().default(""),
});

export async function POST(request: Request) {
  const ip = getClientIp(request) || "unknown";
  try {
    assertRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Trop de messages. Réessayez plus tard." },
        {
          status: 429,
          headers: { "Retry-After": String(err.retryAfterSec) },
        },
      );
    }
    throw err;
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Message invalide. Vérifiez les champs." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  // Silent success for honeypot fills (don't tip off bots).
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  const emailRaw = data.email.trim();
  let email: string | null = null;
  if (emailRaw) {
    const emailOk = z.string().email().safeParse(emailRaw);
    if (!emailOk.success) {
      return NextResponse.json(
        { error: "Message invalide. Vérifiez les champs." },
        { status: 400 },
      );
    }
    email = emailOk.data;
  }

  const locale = data.locale && isLocale(data.locale) ? data.locale : null;

  await createContactMessage({
    kind: data.kind,
    name: data.name,
    email,
    message: data.message,
    locale,
    ip,
    userAgent: request.headers.get("user-agent")?.slice(0, 400) || null,
  });

  return NextResponse.json({ ok: true });
}
