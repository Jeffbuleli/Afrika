import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../src/db";
import {
  admins,
  articleTranslations,
  articles,
  authors,
  categories,
} from "../src/db/schema";

const categorySeed = [
  { slug: "politique", labelFr: "Politique", labelEn: "Politics", sortOrder: 1 },
  { slug: "securite", labelFr: "Sécurité", labelEn: "Security", sortOrder: 2 },
  { slug: "economie", labelFr: "Économie", labelEn: "Economy", sortOrder: 3 },
  { slug: "societe", labelFr: "Société", labelEn: "Society", sortOrder: 4 },
  { slug: "justice", labelFr: "Justice", labelEn: "Justice", sortOrder: 5 },
  { slug: "culture", labelFr: "Culture", labelEn: "Culture", sortOrder: 6 },
  { slug: "afrique", labelFr: "Afrique", labelEn: "Africa", sortOrder: 7 },
  { slug: "opinion", labelFr: "Opinion", labelEn: "Opinion", sortOrder: 8 },
];

const authorSeed = [
  {
    name: "Amina Kabasele",
    slug: "amina-kabasele",
    bioFr: "Correspondante politique et sécurité - Grands Lacs.",
    bioEn: "Politics and security correspondent - Great Lakes.",
  },
  {
    name: "Jean-Marc Okito",
    slug: "jean-marc-okito",
    bioFr: "Analyste économie et ressources naturelles.",
    bioEn: "Economy and natural resources analyst.",
  },
  {
    name: "Sarah Ndaya",
    slug: "sarah-ndaya",
    bioFr: "Journaliste société et Afrique.",
    bioEn: "Society and Africa reporter.",
  },
];

type SeedArticle = {
  slug: string;
  category: string;
  featured: boolean;
  publishedAt: string;
  image: string;
  title: string;
  excerpt: string;
  title_en: string;
  excerpt_en: string;
  body_en: string;
  body_fr: string;
  readingTimeMinutes: number;
  author: string;
  coverImageAltFr: string;
  coverImageAltEn: string;
  country?: string;
};

async function main() {
  console.log("Seeding Africa Insight (SHINTA through August 2026)...");

  await db.delete(articleTranslations);
  await db.delete(articles);

  for (const c of categorySeed) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, c.slug),
    });
    if (!existing) await db.insert(categories).values(c);
  }

  for (const a of authorSeed) {
    const existing = await db.query.authors.findFirst({
      where: eq(authors.slug, a.slug),
    });
    if (!existing) await db.insert(authors).values(a);
  }

  const allCategories = await db.select().from(categories);
  const allAuthors = await db.select().from(authors);
  const catMap = Object.fromEntries(allCategories.map((c) => [c.slug, c.id]));
  const authorMap = Object.fromEntries(allAuthors.map((a) => [a.slug, a.id]));

  const metaPath = path.join(process.cwd(), "content/seed-all.json");
  const seedArticles = JSON.parse(
    fs.readFileSync(metaPath, "utf-8"),
  ) as SeedArticle[];

  let n = 0;
  for (const item of seedArticles) {
    if (!catMap[item.category] || !authorMap[item.author]) {
      console.warn("skip missing refs", item.slug, item.category, item.author);
      continue;
    }
    const [created] = await db
      .insert(articles)
      .values({
        slug: item.slug,
        categoryId: catMap[item.category],
        authorId: authorMap[item.author],
        status: "published",
        country: item.country || null,
        coverImageUrl: item.image,
        coverImageAltFr: item.coverImageAltFr,
        coverImageAltEn: item.coverImageAltEn,
        featured: Boolean(item.featured),
        readingTimeMinutes: item.readingTimeMinutes || 5,
        publishedAt: item.publishedAt,
      })
      .returning();

    await db.insert(articleTranslations).values([
      {
        articleId: created.id,
        locale: "fr",
        title: item.title,
        excerpt: item.excerpt,
        body: item.body_fr,
        seoTitle: item.title,
        seoDescription: item.excerpt,
      },
      {
        articleId: created.id,
        locale: "en",
        title: item.title_en,
        excerpt: item.excerpt_en,
        body: item.body_en,
        seoTitle: item.title_en,
        seoDescription: item.excerpt_en,
      },
    ]);
    n += 1;
  }

  const email = (process.env.ADMIN_EMAIL || "editor@africainsight.local")
    .toLowerCase()
    .trim();
  const password = process.env.ADMIN_PASSWORD || "africa-insight-dev";
  const existingAdmin = await db.query.admins.findFirst({
    where: eq(admins.email, email),
  });
  if (!existingAdmin) {
    await db.insert(admins).values({
      email,
      name: "Editor",
      passwordHash: await hash(password, 10),
    });
    console.log(`Admin created: ${email} / ${password}`);
  }

  console.log(`Seed complete - ${n} articles (SHINTA through August).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
