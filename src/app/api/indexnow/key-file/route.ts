import { indexNowKey } from "@/lib/indexnow";

/** IndexNow key file (rewritten from /{INDEXNOW_KEY}.txt in next.config). */
export async function GET() {
  const key = indexNowKey();
  if (!key) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(`${key}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
