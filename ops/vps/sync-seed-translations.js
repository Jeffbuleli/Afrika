#!/usr/bin/env node
/**
 * Sync seed-all.json into the live SQLite DB:
 * - update FR/EN translations for existing slugs
 * - INSERT missing articles (new SHINTA batches) without wiping visits/admins
 */
const fs = require("fs");
const Database = require("better-sqlite3");

const seedPath = process.argv[2] || "/tmp/seed-all.json";
const dbPath = process.argv[3] || "/app/data/africa-insight.db";
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const db = new Database(dbPath);

const find = db.prepare("SELECT id FROM articles WHERE slug = ?");
const catBySlug = db.prepare("SELECT id FROM categories WHERE slug = ?");
const authorBySlug = db.prepare("SELECT id FROM authors WHERE slug = ?");

const upd = db.prepare(`
  UPDATE article_translations
  SET title = ?, excerpt = ?, body = ?, seo_title = ?, seo_description = ?
  WHERE article_id = ? AND locale = ?
`);
const updArticle = db.prepare(`
  UPDATE articles
  SET cover_image_alt_fr = ?, cover_image_alt_en = ?, cover_image_url = ?,
      featured = ?, reading_time_minutes = ?, published_at = ?, country = ?,
      updated_at = datetime('now')
  WHERE id = ?
`);
const insertArticle = db.prepare(`
  INSERT INTO articles (
    slug, category_id, author_id, status, country, cover_image_url,
    cover_image_alt_fr, cover_image_alt_en, featured, reading_time_minutes, published_at
  ) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)
`);
const insertTr = db.prepare(`
  INSERT INTO article_translations (
    article_id, locale, title, excerpt, body, seo_title, seo_description
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let updated = 0;
let inserted = 0;
let skipped = 0;

const tx = db.transaction((items) => {
  for (const item of items) {
    const row = find.get(item.slug);
    if (row) {
      upd.run(
        item.title,
        item.excerpt,
        item.body_fr,
        item.title,
        item.excerpt,
        row.id,
        "fr",
      );
      upd.run(
        item.title_en,
        item.excerpt_en,
        item.body_en,
        item.title_en,
        item.excerpt_en,
        row.id,
        "en",
      );
      updArticle.run(
        item.coverImageAltFr || null,
        item.coverImageAltEn || null,
        item.image || null,
        item.featured ? 1 : 0,
        item.readingTimeMinutes || 5,
        item.publishedAt || null,
        item.country || null,
        row.id,
      );
      updated += 1;
      continue;
    }

    const cat = catBySlug.get(item.category);
    const author = authorBySlug.get(item.author);
    if (!cat || !author) {
      skipped += 1;
      continue;
    }
    const info = insertArticle.run(
      item.slug,
      cat.id,
      author.id,
      item.country || null,
      item.image || null,
      item.coverImageAltFr || null,
      item.coverImageAltEn || null,
      item.featured ? 1 : 0,
      item.readingTimeMinutes || 5,
      item.publishedAt || null,
    );
    const articleId = Number(info.lastInsertRowid);
    insertTr.run(
      articleId,
      "fr",
      item.title,
      item.excerpt,
      item.body_fr,
      item.title,
      item.excerpt,
    );
    insertTr.run(
      articleId,
      "en",
      item.title_en,
      item.excerpt_en,
      item.body_en,
      item.title_en,
      item.excerpt_en,
    );
    inserted += 1;
  }
});

tx(seed);

// Drop superseded DRC Aug 1-15 batch articles no longer in seed
const seedSlugs = new Set(seed.map((i) => i.slug));
const drcAug = db
  .prepare(
    `SELECT id, slug FROM articles
     WHERE country = 'DRC'
       AND published_at >= '2026-08-01'
       AND published_at < '2026-08-16'`,
  )
  .all();
const delTr = db.prepare(`DELETE FROM article_translations WHERE article_id = ?`);
const delArt = db.prepare(`DELETE FROM articles WHERE id = ?`);
let pruned = 0;
const pruneTx = db.transaction((rows) => {
  for (const row of rows) {
    if (seedSlugs.has(row.slug)) continue;
    delTr.run(row.id);
    delArt.run(row.id);
    pruned += 1;
  }
});
pruneTx(drcAug);

console.log(
  JSON.stringify({
    updated,
    inserted,
    skipped,
    pruned,
    total: seed.length,
  }),
);
