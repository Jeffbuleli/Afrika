import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { estimateReadingTime } from "@/lib/articles";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.articles.findMany({
    with: {
      translations: true,
      category: true,
      author: true,
    },
    orderBy: (a, { desc }) => [desc(a.updatedAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const titleFr = String(body.titleFr || "").trim();
  const titleEn = String(body.titleEn || "").trim();
  if (!titleFr && !titleEn) {
    return NextResponse.json(
      { error: "Au moins un titre (FR ou EN) est requis." },
      { status: 400 },
    );
  }

  const slug = String(body.slug || "").trim() || slugify(titleFr || titleEn);
  const status = body.status === "published" ? "published" : "draft";
  const readingBody = String(body.bodyFr || body.bodyEn || "");
  const readingTimeMinutes = await estimateReadingTime(readingBody);

  try {
    const [created] = await db
      .insert(articles)
      .values({
        slug,
        categoryId: Number(body.categoryId),
        authorId: Number(body.authorId),
        status,
        coverImageUrl: body.coverImageUrl || null,
        coverImageAltFr: body.coverImageAltFr || titleFr || null,
        coverImageAltEn: body.coverImageAltEn || titleEn || null,
        featured: Boolean(body.featured),
        readingTimeMinutes,
        publishedAt:
          status === "published"
            ? body.publishedAt || new Date().toISOString()
            : null,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    const translations = [];
    if (titleFr) {
      translations.push({
        articleId: created.id,
        locale: "fr" as const,
        title: titleFr,
        excerpt: String(body.excerptFr || ""),
        body: String(body.bodyFr || ""),
        seoTitle: titleFr,
        seoDescription: String(body.excerptFr || ""),
      });
    }
    if (titleEn) {
      translations.push({
        articleId: created.id,
        locale: "en" as const,
        title: titleEn,
        excerpt: String(body.excerptEn || ""),
        body: String(body.bodyEn || ""),
        seoTitle: titleEn,
        seoDescription: String(body.excerptEn || ""),
      });
    }
    if (translations.length) {
      await db.insert(articleTranslations).values(translations);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Ce slug existe déjà." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, id),
    with: { translations: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const status = body.status === "published" ? "published" : "draft";
  const readingBody = String(body.bodyFr || body.bodyEn || "");
  const readingTimeMinutes = await estimateReadingTime(readingBody);

  await db
    .update(articles)
    .set({
      slug: String(body.slug || existing.slug),
      categoryId: Number(body.categoryId || existing.categoryId),
      authorId: Number(body.authorId || existing.authorId),
      status,
      coverImageUrl:
        body.coverImageUrl !== undefined
          ? body.coverImageUrl || null
          : existing.coverImageUrl,
      coverImageAltFr: body.coverImageAltFr ?? existing.coverImageAltFr,
      coverImageAltEn: body.coverImageAltEn ?? existing.coverImageAltEn,
      featured:
        body.featured !== undefined
          ? Boolean(body.featured)
          : existing.featured,
      readingTimeMinutes,
      publishedAt:
        status === "published"
          ? existing.publishedAt || new Date().toISOString()
          : existing.publishedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(articles.id, id));

  const translations = existing.translations;

  async function upsertTranslation(
    locale: "fr" | "en",
    title: string,
    excerpt: string,
    bodyMd: string,
  ) {
    if (!title.trim()) return;
    const found = translations.find((tr) => tr.locale === locale);
    if (found) {
      await db
        .update(articleTranslations)
        .set({
          title,
          excerpt,
          body: bodyMd,
          seoTitle: title,
          seoDescription: excerpt,
        })
        .where(eq(articleTranslations.id, found.id));
    } else {
      await db.insert(articleTranslations).values({
        articleId: id,
        locale,
        title,
        excerpt,
        body: bodyMd,
        seoTitle: title,
        seoDescription: excerpt,
      });
    }
  }

  await upsertTranslation(
    "fr",
    String(body.titleFr || ""),
    String(body.excerptFr || ""),
    String(body.bodyFr || ""),
  );
  await upsertTranslation(
    "en",
    String(body.titleEn || ""),
    String(body.excerptEn || ""),
    String(body.bodyEn || ""),
  );

  return NextResponse.json({ ok: true });
}
