import { NextResponse } from "next/server";
import { recordPwaInstallFromRequest } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    recordPwaInstallFromRequest(request);
  } catch (err) {
    console.error("pwa install log failed", err);
  }
  return NextResponse.json({ ok: true });
}
