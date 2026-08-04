"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

const DISMISS_KEY = "ai-install-dismissed-v1";
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
    // iOS Safari
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

export function InstallAppPrompt({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || wasDismissed()) return;

    // Register SW (required for Chrome installability).
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // non-blocking
      });
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS has no beforeinstallprompt — show manual tip after a short delay.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      timer = setTimeout(() => {
        if (!wasDismissed() && !isStandalone()) {
          setIosHint(true);
          setVisible(true);
        }
      }, 4500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const onInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setVisible(false);
        return;
      }
    }
    dismiss();
    setVisible(false);
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
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!iosHint ? (
            <button
              type="button"
              onClick={() => void onInstall()}
              className="bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper hover:bg-navy/90"
            >
              {copy.installCta}
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
