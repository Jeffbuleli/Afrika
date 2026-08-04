"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

const DISMISS_KEY = "ai-install-dismissed-v2";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function wasDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    // ignore
  }
}

async function ensureServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    await navigator.serviceWorker.register("/sw.js?v=2", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}

export function InstallAppPrompt({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || wasDismissed()) return;

    let cancelled = false;
    const onBip = (e: Event) => {
      e.preventDefault();
      if (cancelled) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setIosHint(false);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      dismiss();
    };
    window.addEventListener("appinstalled", onInstalled);

    void (async () => {
      await ensureServiceWorker();
      if (cancelled) return;
      if (isIos()) {
        window.setTimeout(() => {
          if (cancelled || wasDismissed() || isStandalone()) return;
          setIosHint(true);
          setVisible(true);
        }, 3500);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const onInstall = async () => {
    setError(null);
    setBusy(true);
    try {
      const ok = await ensureServiceWorker();
      if (!ok) {
        setError(copy.installError);
        return;
      }
      if (!deferred) {
        // Event not available yet - keep banner, tell user to use browser menu.
        setError(copy.installManual);
        return;
      }
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setVisible(false);
        return;
      }
      // User cancelled native sheet - keep banner dismissible.
    } catch {
      setError(copy.installError);
    } finally {
      setBusy(false);
    }
  };

  const onClose = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={copy.installTitle}
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-3 border border-line bg-paper px-4 py-3 shadow-[0_-8px_30px_rgba(26,43,72,0.18)] sm:items-center">
        <div className="hidden sm:block shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-[-0.02em] text-navy">
            {copy.installTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
            {iosHint ? copy.installIosHint : copy.installBody}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-accent-deep">{error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!iosHint ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onInstall()}
              className="bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper hover:bg-navy/90 disabled:opacity-60"
            >
              {busy ? copy.installing : copy.installCta}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-2 text-xs uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
          >
            {copy.installLater}
          </button>
        </div>
      </div>
    </div>
  );
}
