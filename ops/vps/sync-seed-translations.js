#!/usr/bin/env node
/**
 * Sync article translations from /tmp/seed-all.json into the live SQLite DB.
 * Does not wipe visits, admins, or messages.
 */
const fs = require("fs");
const Database = require("better-sqlite3");

const seedPath = process.argv[2] || "/tmp/seed-all.json";
const dbPath = process.argv[3] || "/app/data/africa-insight.db";
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const db = new Database(dbPath);

const find = db.prepare("SELECT id FROM articles WHERE slug = ?");
const upd = db.prepare(`
  UPDATE article_translations
  SET title = ?, excerpt = ?, body = ?, seo_title = ?, seo_description = ?
  WHERE article_id = ? AND locale = ?
`);
const updAlt = db.prepare(`
  UPDATE articles
  SET cover_image_alt_fr = ?, cover_image_alt_en = ?
  WHERE id = ?
`);

let updated = 0;
let missing = 0;
const tx = db.transaction((items) => {
  for (const item of items) {
    const row = find.get(item.slug);
    if (!row) {
      missing += 1;
      continue;
    }
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
    updAlt.run(
      item.coverImageAltFr || null,
      item.coverImageAltEn || null,
      row.id,
    );
    updated += 1;
  }
});
tx(seed);
console.log(JSON.stringify({ updated, missing, total: seed.length }));
