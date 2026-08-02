import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storeUpload } from "@/lib/storage";
import { db } from "@/db";
import { media } from "@/db/schema";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  try {
    const stored = await storeUpload(file);
    await db.insert(media).values({
      key: stored.key,
      url: stored.url,
      altFr: file.name,
      altEn: file.name,
    });
    return NextResponse.json(stored);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
