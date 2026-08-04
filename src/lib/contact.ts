import { db, sqlite } from "@/db";
import { contactMessages } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

let schemaReady = false;

export function ensureContactSchema() {
  if (schemaReady) return;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'contact',
      name TEXT NOT NULL,
      email TEXT,
      message TEXT NOT NULL,
      locale TEXT,
      ip TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS contact_messages_created_idx
      ON contact_messages (created_at DESC);
    CREATE INDEX IF NOT EXISTS contact_messages_status_idx
      ON contact_messages (status);
  `);
  schemaReady = true;
}

export async function createContactMessage(input: {
  kind: "suggestion" | "contact";
  name: string;
  email: string | null;
  message: string;
  locale: string | null;
  ip: string | null;
  userAgent: string | null;
}) {
  ensureContactSchema();
  const [row] = await db
    .insert(contactMessages)
    .values({
      kind: input.kind,
      name: input.name,
      email: input.email,
      message: input.message,
      locale: input.locale,
      ip: input.ip,
      userAgent: input.userAgent,
      status: "new",
    })
    .returning({ id: contactMessages.id });
  return row;
}

export async function listContactMessages(limit = 100) {
  ensureContactSchema();
  return db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(Math.min(Math.max(limit, 1), 300));
}

export async function countNewContactMessages() {
  ensureContactSchema();
  const rows = await db
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(eq(contactMessages.status, "new"));
  return rows.length;
}

export async function setContactMessageStatus(
  id: number,
  status: "new" | "read" | "archived",
) {
  ensureContactSchema();
  await db
    .update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id));
}
