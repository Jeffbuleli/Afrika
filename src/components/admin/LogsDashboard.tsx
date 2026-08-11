"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthStats, VisitStats } from "@/lib/analytics";

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

type SortDir = "asc" | "desc";

const LOG_LIMIT = 150;

function whereOf(row: {
  city: string | null;
  region: string | null;
  country: string | null;
}) {
  return [row.city, row.region, row.country].filter(Boolean).join(", ") || "-";
}

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

function parseWhen(iso: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso)
    ? iso
    : `${iso.replace(" ", "T")}Z`;
  return new Date(normalized).getTime();
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

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://www.africa-insight.org";
}

function pageUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${normalized}`;
}

function isExternalUrl(value: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function sortRows<T>(
  rows: T[],
  key: keyof T,
  dir: SortDir,
  valueOf?: (row: T) => string | number,
) {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = valueOf ? valueOf(a) : a[key];
    const bv = valueOf ? valueOf(b) : b[key];
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * factor;
    }
    return String(av ?? "").localeCompare(String(bv ?? ""), "fr") * factor;
  });
}

function StatTile({
  label,
  value,
  hint,
  accent = "bg-navy",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="border border-line bg-paper-deep/40 p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
      <div className={`mt-3 h-1 w-10 ${accent}`} />
    </div>
  );
}

function BucketBars({
  title,
  buckets,
  emptyLabel = "Aucune donnée",
}: {
  title: string;
  buckets: Array<{ label: string; value: number }>;
  emptyLabel?: string;
}) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <div className="border border-line bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {buckets.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {buckets.map((bucket) => (
            <li key={bucket.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink">{bucket.label}</span>
                <span className="shrink-0 font-medium text-navy">
                  {bucket.value}
                </span>
              </div>
              <div className="h-1.5 bg-paper-deep">
                <div
                  className="h-full bg-navy"
                  style={{ width: `${Math.max(8, (bucket.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExternalLink({
  href,
  children,
  title,
  className = "",
}: {
  href: string;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title || href}
      className={`inline-flex max-w-full items-center gap-1 text-navy hover:underline ${className}`}
    >
      <span className="truncate">{children}</span>
      <span aria-hidden className="shrink-0 text-[0.65rem] opacity-70">
        ↗
      </span>
    </a>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-medium ${
        active ? "text-navy" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
      <span className="text-[0.65rem]">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function LogsDashboard() {
  const [tab, setTab] = useState<"visits" | "auth">("visits");
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [auth, setAuth] = useState<AuthRow[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [visitSortKey, setVisitSortKey] = useState<keyof VisitRow>("createdAt");
  const [visitSortDir, setVisitSortDir] = useState<SortDir>("desc");
  const [authSortKey, setAuthSortKey] = useState<keyof AuthRow>("createdAt");
  const [authSortDir, setAuthSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    try {
      const [vRes, aRes] = await Promise.all([
        fetch(`/api/admin/logs?type=visits&limit=${LOG_LIMIT}`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/logs?type=auth&limit=${LOG_LIMIT}`, {
          cache: "no-store",
        }),
      ]);
      if (!vRes.ok || !aRes.ok) {
        setError("Impossible de charger les logs.");
        return;
      }
      const vJson = await vRes.json();
      const aJson = await aRes.json();
      setVisits(vJson.rows || []);
      setAuth(aJson.rows || []);
      setVisitStats(vJson.stats || null);
      setAuthStats(aJson.stats || null);
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

  const sortedVisits = useMemo(() => {
    if (visitSortKey === "createdAt") {
      return sortRows(visits, visitSortKey, visitSortDir, (row) =>
        parseWhen(row.createdAt),
      );
    }
    return sortRows(visits, visitSortKey, visitSortDir);
  }, [visits, visitSortDir, visitSortKey]);

  const sortedAuth = useMemo(() => {
    if (authSortKey === "createdAt") {
      return sortRows(auth, authSortKey, authSortDir, (row) =>
        parseWhen(row.createdAt),
      );
    }
    return sortRows(auth, authSortKey, authSortDir);
  }, [auth, authSortDir, authSortKey]);

  function toggleVisitSort(key: keyof VisitRow) {
    if (visitSortKey === key) {
      setVisitSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setVisitSortKey(key);
    setVisitSortDir(key === "createdAt" ? "desc" : "asc");
  }

  function toggleAuthSort(key: keyof AuthRow) {
    if (authSortKey === key) {
      setAuthSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setAuthSortKey(key);
    setAuthSortDir(key === "createdAt" ? "desc" : "asc");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            Logs & visites
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Aperçu des {LOG_LIMIT} derniers événements · IP, lieu, navigateur
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

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {tab === "visits" && visitStats ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Visites enregistrées"
            value={visitStats.total}
            hint={`max ${LOG_LIMIT} conservées`}
          />
          <StatTile
            label="IP uniques"
            value={visitStats.uniqueIps}
            hint="sur la fenêtre active"
            accent="bg-emerald-700"
          />
          <StatTile
            label="Dernières 24 h"
            value={visitStats.last24h}
            hint="pages vues récentes"
            accent="bg-amber-600"
          />
          <StatTile
            label="Pages distinctes"
            value={visitStats.topPages.length}
            hint="dans le top actuel"
            accent="bg-slate-700"
          />
        </div>
      ) : null}

      {tab === "auth" && authStats ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Événements auth"
            value={authStats.total}
            hint={`max ${LOG_LIMIT} conservés`}
          />
          <StatTile
            label="Connexions OK"
            value={authStats.loginSuccess}
            accent="bg-emerald-700"
          />
          <StatTile
            label="Échecs"
            value={authStats.loginFailure}
            accent="bg-red-700"
          />
          <StatTile
            label="IP uniques"
            value={authStats.uniqueIps}
            hint={`${authStats.logout} déconnexions`}
            accent="bg-slate-700"
          />
        </div>
      ) : null}

      {tab === "visits" && visitStats ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <BucketBars title="Top pages" buckets={visitStats.topPages} />
          <BucketBars title="Top pays" buckets={visitStats.topCountries} />
          <BucketBars title="Navigateurs" buckets={visitStats.topBrowsers} />
          <BucketBars title="Langues" buckets={visitStats.topLocales} />
        </div>
      ) : null}

      {tab === "auth" && authStats ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <BucketBars title="Pays (connexions)" buckets={authStats.topCountries} />
        </div>
      ) : null}

      <div className="mt-6 flex gap-2 border-b border-line pb-0">
        <button
          type="button"
          onClick={() => setTab("visits")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "visits"
              ? "border-b-2 border-navy text-navy"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Visites site ({visits.length}/{LOG_LIMIT})
        </button>
        <button
          type="button"
          onClick={() => setTab("auth")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "auth"
              ? "border-b-2 border-navy text-navy"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Connexions éditeur ({auth.length}/{LOG_LIMIT})
        </button>
      </div>

      {tab === "auth" ? (
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper-deep text-xs uppercase tracking-[0.08em] text-ink-soft">
              <tr>
                <th className="px-3 py-2">
                  <SortButton
                    label="Quand"
                    active={authSortKey === "createdAt"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("createdAt")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Événement"
                    active={authSortKey === "event"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("event")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Email"
                    active={authSortKey === "email"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("email")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="IP"
                    active={authSortKey === "ip"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("ip")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Pays"
                    active={authSortKey === "country"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("country")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Navigateur"
                    active={authSortKey === "browser"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("browser")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="OS"
                    active={authSortKey === "os"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("os")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Appareil"
                    active={authSortKey === "device"}
                    dir={authSortDir}
                    onClick={() => toggleAuthSort("device")}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedAuth.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-ink-soft">
                    Aucune connexion enregistrée pour l’instant.
                  </td>
                </tr>
              ) : (
                sortedAuth.map((row) => (
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
                      {row.ip || "-"}
                    </td>
                    <td className="px-3 py-2">{whereOf(row)}</td>
                    <td className="px-3 py-2">{row.browser || "-"}</td>
                    <td className="px-3 py-2">{row.os || "-"}</td>
                    <td className="px-3 py-2">
                      <span title={row.userAgent || undefined}>
                        {row.device || "-"}
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
                <th className="px-3 py-2">
                  <SortButton
                    label="Quand"
                    active={visitSortKey === "createdAt"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("createdAt")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Page"
                    active={visitSortKey === "path"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("path")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="IP"
                    active={visitSortKey === "ip"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("ip")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Pays"
                    active={visitSortKey === "country"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("country")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Navigateur"
                    active={visitSortKey === "browser"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("browser")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="OS"
                    active={visitSortKey === "os"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("os")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Appareil"
                    active={visitSortKey === "device"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("device")}
                  />
                </th>
                <th className="px-3 py-2">
                  <SortButton
                    label="Référent"
                    active={visitSortKey === "referrer"}
                    dir={visitSortDir}
                    onClick={() => toggleVisitSort("referrer")}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-ink-soft">
                    Aucune visite enregistrée pour l’instant.
                  </td>
                </tr>
              ) : (
                sortedVisits.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-paper-deep/50">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="max-w-[240px] px-3 py-2 font-medium">
                      <ExternalLink href={pageUrl(row.path)} title="Ouvrir la page">
                        {row.path}
                      </ExternalLink>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.ip || "-"}
                    </td>
                    <td className="px-3 py-2">{whereOf(row)}</td>
                    <td className="px-3 py-2">{row.browser || "-"}</td>
                    <td className="px-3 py-2">{row.os || "-"}</td>
                    <td className="px-3 py-2">
                      <span title={row.userAgent || undefined}>
                        {row.device || "-"}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-xs text-ink-soft">
                      {isExternalUrl(row.referrer) ? (
                        <ExternalLink href={row.referrer!} title="Ouvrir le référent">
                          {row.referrer}
                        </ExternalLink>
                      ) : (
                        row.referrer || "-"
                      )}
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
