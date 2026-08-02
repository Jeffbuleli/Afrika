import { NextResponse } from "next/server";
import { createSession, verifyAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "");
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 },
    );
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return NextResponse.json(
      { error: "Identifiants invalides." },
      { status: 401 },
    );
  }

  await createSession(admin);
  return NextResponse.json({ ok: true });
}
