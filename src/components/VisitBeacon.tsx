"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitBeacon({ locale }: { locale: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({
      path: pathname,
      locale,
      referrer: document.referrer || null,
    });

    const send = () => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/analytics/visit",
            new Blob([payload], { type: "application/json" }),
          );
          return;
        }
      } catch {
        // fall through
      }
      void fetch("/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    };

    send();
  }, [pathname, locale]);

  return null;
}
