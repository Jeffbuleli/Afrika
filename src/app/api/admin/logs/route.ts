import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminAuthLogs, visitLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  ensureAnalyticsSchema,
  enforceLogRetention,
  getAuthStats,
  getVisitStats,
  LOG_RETENTION,
} from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureAnalyticsSchema();
  enforceLogRetention();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "visits";
  const statsOnly = searchParams.get("stats") === "1";
  const limit = Math.min(
    LOG_RETENTION,
    Math.max(
      20,
      Number.parseInt(searchParams.get("limit") || String(LOG_RETENTION), 10) ||
        LOG_RETENTION,
    ),
  );

  if (statsOnly) {
    return NextResponse.json({
      retention: LOG_RETENTION,
      visits: getVisitStats(),
      auth: getAuthStats(),
    });
  }

  if (type === "auth") {
    const rows = await db
      .select()
      .from(adminAuthLogs)
      .orderBy(desc(adminAuthLogs.createdAt))
      .limit(limit);
    return NextResponse.json({
      type: "auth",
      rows,
      retention: LOG_RETENTION,
      stats: getAuthStats(),
    });
  }

  const rows = await db
    .select()
    .from(visitLogs)
    .orderBy(desc(visitLogs.createdAt))
    .limit(limit);
  return NextResponse.json({
    type: "visits",
    rows,
    retention: LOG_RETENTION,
    stats: getVisitStats(),
  });
}
