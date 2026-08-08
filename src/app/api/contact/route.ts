import { NextResponse } from "next/server";
import { z } from "zod";
import { createContactMessage } from "@/lib/contact";
import { assessContactSpam } from "@/lib/contact-spam";
import { getClientIp } from "@/lib/client-info";
import { assertRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isLocale } from "@/lib/i18n";

const bodySchema = z.object({
  kind: z.enum(["suggestion", "contact"]).default("contact"),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(10).max(2000),
  locale: z.string().optional(),
  // Honeypot - bots fill this; humans leave empty.
  website: z.string().max(80).optional().default(""),
  // Client-rendered form open time (ms since epoch).
  formOpenedAt: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request) || "unknown";
  try {
    // Stricter: 3 messages / 15 min per IP.
    assertRateLimit(`contact:${ip}`, 3, 15 * 60 * 1000);
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
    email = emailOk.data.toLowerCase();
    try {
      assertRateLimit(`contact-email:${email}`, 3, 60 * 60 * 1000);
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
  }

  const locale = data.locale && isLocale(data.locale) ? data.locale : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 400) || null;
  const formAgeMs =
    typeof data.formOpenedAt === "number"
      ? Date.now() - data.formOpenedAt
      : null;

  // Reject impossible future clocks / absurd ages (> 24h).
  const ageOk =
    formAgeMs == null || (formAgeMs >= 0 && formAgeMs < 24 * 60 * 60 * 1000);

  const assessment = assessContactSpam({
    name: data.name,
    email,
    message: data.message,
    kind: data.kind,
    formAgeMs: ageOk ? formAgeMs : 0,
    userAgent,
  });

  if (assessment.action === "block") {
    // Fake success so scrapers don't iterate on the payload.
    console.info(
      JSON.stringify({
        type: "contact_spam_block",
        ip,
        score: assessment.score,
        reasons: assessment.reasons,
      }),
    );
    return NextResponse.json({ ok: true });
  }

  await createContactMessage({
    kind: data.kind,
    name: data.name,
    email,
    message: data.message,
    locale,
    ip,
    userAgent,
    status: assessment.action === "spam" ? "spam" : "new",
  });

  if (assessment.action === "spam") {
    console.info(
      JSON.stringify({
        type: "contact_spam_quarantine",
        ip,
        score: assessment.score,
        reasons: assessment.reasons,
      }),
    );
  }

  return NextResponse.json({ ok: true });
}
