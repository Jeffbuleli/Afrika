#!/usr/bin/env node
/** Replace em/en dashes with ASCII hyphen in live article text. */
const Database = require("better-sqlite3");
const dbPath = process.argv[2] || "/app/data/africa-insight.db";
const db = new Database(dbPath);

function scrub(s) {
  if (s == null) return s;
  return String(s).replace(/\u2014/g, "-").replace(/\u2013/g, "-");
}

const rows = db
  .prepare(
    "SELECT id, title, excerpt, body, seo_title, seo_description FROM article_translations",
  )
  .all();

const upd = db.prepare(`
  UPDATE article_translations
  SET title = ?, excerpt = ?, body = ?, seo_title = ?, seo_description = ?
  WHERE id = ?
`);

let changed = 0;
const tx = db.transaction((items) => {
  for (const row of items) {
    const title = scrub(row.title);
    const excerpt = scrub(row.excerpt);
    const body = scrub(row.body);
    const seoTitle = scrub(row.seo_title);
    const seoDescription = scrub(row.seo_description);
    if (
      title !== row.title ||
      excerpt !== row.excerpt ||
      body !== row.body ||
      seoTitle !== row.seo_title ||
      seoDescription !== row.seo_description
    ) {
      upd.run(title, excerpt, body, seoTitle, seoDescription, row.id);
      changed += 1;
    }
  }
});
tx(rows);

const arts = db
  .prepare("SELECT id, cover_image_alt_fr, cover_image_alt_en FROM articles")
  .all();
const updAlt = db.prepare(
  "UPDATE articles SET cover_image_alt_fr = ?, cover_image_alt_en = ? WHERE id = ?",
);
let altChanged = 0;
const txAlt = db.transaction((items) => {
  for (const row of items) {
    const fr = scrub(row.cover_image_alt_fr);
    const en = scrub(row.cover_image_alt_en);
    if (fr !== row.cover_image_alt_fr || en !== row.cover_image_alt_en) {
      updAlt.run(fr, en, row.id);
      altChanged += 1;
    }
  }
});
txAlt(arts);

console.log(JSON.stringify({ translationsChanged: changed, articlesChanged: altChanged }));
