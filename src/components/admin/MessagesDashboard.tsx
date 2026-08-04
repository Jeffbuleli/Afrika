"use client";

import { useCallback, useEffect, useState } from "react";

type Message = {
  id: number;
  kind: "suggestion" | "contact";
  name: string;
  email: string | null;
  message: string;
  locale: string | null;
  ip: string | null;
  userAgent: string | null;
  status: "new" | "read" | "archived";
  createdAt: string;
};

function formatWhen(iso: string) {
  try {
    const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso)
      ? iso
      : `${iso.replace(" ", "T")}Z`;
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Africa/Kinshasa",
    }).format(new Date(normalized));
  } catch {
    return iso;
  }
}

export function MessagesDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "read" | "archived">(
    "all",
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages?limit=200");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages || []);
      setError("");
    } catch {
      setError("Impossible de charger les messages.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: number, status: Message["status"]) {
    const res = await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
    }
  }

  const visible = messages.filter((m) =>
    filter === "all" ? true : m.status === filter,
  );
  const newCount = messages.filter((m) => m.status === "new").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            Messages lecteurs
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Suggestions et contacts — {newCount} non lu
            {newCount > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="border border-line px-3 py-2 text-xs uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
        >
          Actualiser
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", "new", "read", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "bg-ink px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-paper"
                : "border border-line px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft"
            }
          >
            {f === "all"
              ? "Tous"
              : f === "new"
                ? "Nouveaux"
                : f === "read"
                  ? "Lus"
                  : "Archivés"}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-accent-deep">{error}</p> : null}

      <ul className="mt-8 divide-y divide-line border-t border-line">
        {visible.length === 0 ? (
          <li className="py-8 text-sm text-ink-soft">Aucun message.</li>
        ) : (
          visible.map((m) => (
            <li key={m.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={
                        m.status === "new"
                          ? "bg-emerald-100 px-2 py-0.5 text-emerald-900"
                          : "bg-paper-deep px-2 py-0.5 text-ink-soft"
                      }
                    >
                      {m.status === "new"
                        ? "Nouveau"
                        : m.status === "read"
                          ? "Lu"
                          : "Archivé"}
                    </span>
                    <span className="uppercase tracking-[0.12em] text-ink-soft">
                      {m.kind === "suggestion" ? "Suggestion" : "Contact"}
                    </span>
                    <span className="text-ink-soft">{formatWhen(m.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-medium">
                    {m.name}
                    {m.email ? (
                      <span className="ml-2 text-sm font-normal text-ink-soft">
                        · {m.email}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {m.message}
                  </p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {m.locale || "—"} · {m.ip || "IP ?"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 text-xs">
                  {m.status !== "read" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus(m.id, "read")}
                      className="text-accent-deep hover:text-accent"
                    >
                      Marquer lu
                    </button>
                  ) : null}
                  {m.status !== "new" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus(m.id, "new")}
                      className="text-ink-soft hover:text-ink"
                    >
                      Remettre nouveau
                    </button>
                  ) : null}
                  {m.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => void setStatus(m.id, "archived")}
                      className="text-ink-soft hover:text-ink"
                    >
                      Archiver
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
