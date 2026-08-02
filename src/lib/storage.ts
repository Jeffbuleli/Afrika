import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export type StoredFile = {
  key: string;
  url: string;
};

/**
 * Local uploads for development. Swap STORAGE_DRIVER=r2 in prod
 * and implement the R2 branch with S3-compatible client.
 */
export async function storeUpload(
  file: File,
  folder = "articles",
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER || "local";
  const ext = path.extname(file.name) || ".jpg";
  const key = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

  if (driver === "r2") {
    throw new Error(
      "R2 storage is not configured yet. Set STORAGE_DRIVER=local for now, or wire R2 credentials.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dest = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);

  return {
    key,
    url: `/uploads/${key}`,
  };
}
