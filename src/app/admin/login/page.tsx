"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/csrf", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { token?: string };
        if (!cancelled && res.ok && data.token) {
          setCsrfToken(data.token);
          setCsrfReady(true);
        } else if (!cancelled) {
          setError("Impossible d'initialiser la connexion. Rechargez.");
        }
      } catch {
        if (!cancelled) {
          setError("Impossible d'initialiser la connexion. Rechargez.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!csrfToken) {
      setError("Session de connexion expirée. Rechargez la page.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        csrfToken,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(
        (data as { error?: string }).error || "Connexion impossible",
      );
      // Refresh CSRF after failure / expiry
      try {
        const csrfRes = await fetch("/api/admin/csrf", { cache: "no-store" });
        const csrfData = (await csrfRes.json().catch(() => ({}))) as {
          token?: string;
        };
        if (csrfRes.ok && csrfData.token) setCsrfToken(csrfData.token);
      } catch {
        /* ignore */
      }
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">Connexion</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Accès rédaction Africa Insight
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" autoComplete="off">
        <input type="hidden" name="csrfToken" value={csrfToken} readOnly />
        <label className="block">
          <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
            Mot de passe
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !csrfReady}
          className="bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
        >
          {loading ? "…" : "Entrer"}
        </button>
      </form>
    </div>
  );
}
