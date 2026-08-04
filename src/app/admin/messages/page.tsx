import { redirect } from "next/navigation";
import { MessagesDashboard } from "@/components/admin/MessagesDashboard";
import { getSession } from "@/lib/auth";

export default async function AdminMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return <MessagesDashboard />;
}
