import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

function resolveDbPath() {
  const raw = process.env.DATABASE_URL || "file:./data/africa-insight.db";
  const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
  if (path.isAbsolute(filePath)) return filePath;
  // Keep path statically scoped under ./data for bundlers
  const base = path.join(process.cwd(), "data");
  const name = path.basename(filePath) || "africa-insight.db";
  return path.join(base, name);
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
