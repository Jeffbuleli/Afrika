"use client";

import { useCallback, useEffect, useState } from "react";

type VisitRow = {
  id: number;
  path: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string | null;
  referrer: string | null;
  locale: string | null;
  createdAt: string;
};

type AuthRow = {
  id: number;
  email: string;
  event: "login_success" | "login_failure" | "logout";
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string | null;
  createdAt: string;
};

function whereOf(row: {
  city: string | null;
  region: string | null;
  country: string | null;
}) {
  return [row.city, row.region, row.country].filter(Boolean).join(", ") || "—";
}

function formatWhen(iso: string) {
  try {
    // SQLite datetime('now') is UTC without Z — treat as UTC
    const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`;
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Africa/Kinshasa",
    }).format(new Date(normalized));
  } catch {
    return iso;
  }
}

function eventLabel(event: AuthRow["event"]) {
  if (event === "login_success") return "Connexion OK";
  if (event === "login_failure") return "Échec connexion";
  return "Déconnexion";
}

function eventClass(event: AuthRow["event"]) {
  if (event === "login_success") return "bg-emerald-100 text-emerald-900";
  if (event === "login_failure") return "bg-red-100 text-red-900";
  return "bg-paper-deep text-ink-soft";
}

export function LogsDashboard() {
  const [tab, setTab] = useState<"visits" | "auth">("auth");
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [auth, setAuth] = useState<AuthRow[]>([]);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [vRes, aRes] = await Promise.all([
        fetch("/api/admin/logs?type=visits&limit=150", { cache: "no-store" }),
        fetch("/api/admin/logs?type=auth&limit=150", { cache: "no-store" }),
      ]);
      if (!vRes.ok || !aRes.ok) {
        setError("Impossible de charger les logs.");
        return;
      }
      const vJson = await vRes.json();
      const aJson = await aRes.json();
      setVisits(vJson.rows || []);
      setAuth(aJson.rows || []);
      setUpdatedAt(new Date().toLocaleTimeString("fr-FR"));
      setError("");
    } catch {
      setError("Erreur réseau.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [live, load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            Logs en direct
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Visites du site et connexions rédaction (IP, lieu, navigateur)
            {updatedAt ? ` · maj ${updatedAt}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={`border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${
              live
                ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                : "border-line text-ink-soft"
            }`}
          >
            {live ? "Live ON · 5s" : "Live OFF"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="border border-line px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-navy hover:border-navy"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-6 flex gap-2 border-b border-line pb-0">
        <button
          type="button"
          onClick={() => setTab("auth")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "auth"
              ? "border-b-2 border-navy text-navy"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Connexions éditeur ({auth.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("visits")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "visits"
              ? "border-b-2 border-navy text-navy"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Visites site ({visits.length})
        </button>
      </div>

      {tab === "auth" ? (
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper-deep text-xs uppercase tracking-[0.08em] text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Quand</th>
                <th className="px-3 py-2 font-medium">Événement</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Où</th>
                <th className="px-3 py-2 font-medium">Navigateur</th>
                <th className="px-3 py-2 font-medium">OS</th>
                <th className="px-3 py-2 font-medium">Appareil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {auth.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-ink-soft">
                    Aucune connexion enregistrée pour l’instant.
                  </td>
                </tr>
              ) : (
                auth.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-paper-deep/50">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-[0.7rem] font-medium ${eventClass(row.event)}`}
                      >
                        {eventLabel(row.event)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{row.email}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.ip || "—"}
                    </td>
                    <td className="px-3 py-2">{whereOf(row)}</td>
                    <td className="px-3 py-2">{row.browser || "—"}</td>
                    <td className="px-3 py-2">{row.os || "—"}</td>
                    <td className="px-3 py-2">
                      <span title={row.userAgent || undefined}>
                        {row.device || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper-deep text-xs uppercase tracking-[0.08em] text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Quand</th>
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Où</th>
                <th className="px-3 py-2 font-medium">Navigateur</th>
                <th className="px-3 py-2 font-medium">OS</th>
                <th className="px-3 py-2 font-medium">Appareil</th>
                <th className="px-3 py-2 font-medium">Référent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-ink-soft">
                    Aucune visite enregistrée pour l’instant.
                  </td>
                </tr>
              ) : (
                visits.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-paper-deep/50">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2 font-medium">
                      {row.path}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.ip || "—"}
                    </td>
                    <td className="px-3 py-2">{whereOf(row)}</td>
                    <td className="px-3 py-2">{row.browser || "—"}</td>
                    <td className="px-3 py-2">{row.os || "—"}</td>
                    <td className="px-3 py-2">
                      <span title={row.userAgent || undefined}>
                        {row.device || "—"}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-xs text-ink-soft">
                      {row.referrer || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
