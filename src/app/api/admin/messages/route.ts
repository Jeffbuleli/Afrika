import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listContactMessages,
  setContactMessageStatus,
} from "@/lib/contact";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || "100");
  const rows = await listContactMessages(limit);
  return NextResponse.json({ messages: rows });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = z
    .object({
      id: z.number().int().positive(),
      status: z.enum(["new", "read", "archived", "spam"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setContactMessageStatus(parsed.data.id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
