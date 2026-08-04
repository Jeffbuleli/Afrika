import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export type StoredFile = {
  key: string;
  url: string;
};

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Local uploads for development. Swap STORAGE_DRIVER=r2 in prod
 * and implement the R2 branch with S3-compatible client.
 */
export async function storeUpload(
  file: File,
  folder = "articles",
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER || "local";
  const mime = (file.type || "").toLowerCase();
  const ext = ALLOWED[mime];
  if (!ext) {
    throw new Error("Type de fichier non autorisé (JPEG, PNG, WebP, GIF).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo).");
  }

  const key = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

  if (driver === "r2") {
    throw new Error(
      "R2 storage is not configured yet. Set STORAGE_DRIVER=local for now, or wire R2 credentials.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo).");
  }

  const dest = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);

  return {
    key,
    url: `/uploads/${key}`,
  };
}
