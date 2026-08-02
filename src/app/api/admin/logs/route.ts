import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminAuthLogs, visitLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ensureAnalyticsSchema } from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureAnalyticsSchema();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "visits";
  const limit = Math.min(
    300,
    Math.max(20, Number.parseInt(searchParams.get("limit") || "100", 10) || 100),
  );

  if (type === "auth") {
    const rows = await db
      .select()
      .from(adminAuthLogs)
      .orderBy(desc(adminAuthLogs.createdAt))
      .limit(limit);
    return NextResponse.json({ type: "auth", rows });
  }

  const rows = await db
    .select()
    .from(visitLogs)
    .orderBy(desc(visitLogs.createdAt))
    .limit(limit);
  return NextResponse.json({ type: "visits", rows });
}
