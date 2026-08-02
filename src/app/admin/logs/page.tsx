import { redirect } from "next/navigation";
import { LogsDashboard } from "@/components/admin/LogsDashboard";
import { getSession } from "@/lib/auth";
import { ensureAnalyticsSchema } from "@/lib/analytics";

export default async function AdminLogsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  ensureAnalyticsSchema();

  return <LogsDashboard />;
}
