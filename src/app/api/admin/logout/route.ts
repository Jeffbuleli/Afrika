import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { recordAdminAuth } from "@/lib/analytics";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.email) {
    try {
      await recordAdminAuth({
        request,
        email: session.email,
        event: "logout",
      });
    } catch (err) {
      console.error("auth log failed", err);
    }
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
