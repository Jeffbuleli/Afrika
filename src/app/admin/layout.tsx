import Link from "next/link";
import { AdminLogout } from "@/components/AdminLogout";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-deep">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-[-0.03em]"
            >
              Africa Insight - Rédaction
            </Link>
            {session ? (
              <p className="text-xs text-ink-soft mt-1">{session.email}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-sm">
            {session ? (
              <Link href="/admin/logs" className="text-ink-soft hover:text-ink">
                Logs
              </Link>
            ) : null}
            <Link href="/fr" className="text-ink-soft hover:text-ink">
              Voir le site
            </Link>
            {session ? <AdminLogout /> : null}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
