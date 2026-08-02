"use client";

import { useRouter } from "next/navigation";

export function AdminLogout() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-accent-deep hover:text-accent"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
