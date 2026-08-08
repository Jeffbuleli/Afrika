"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function ContactSuggestions({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const [kind, setKind] = useState<"suggestion" | "contact">("suggestion");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [formOpenedAt, setFormOpenedAt] = useState(0);

  useEffect(() => {
    setFormOpenedAt(Date.now());
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website"),
          formOpenedAt: formOpenedAt || Date.now(),
          locale,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(json.error || copy.contactError);
        return;
      }
      form.reset();
      setFormOpenedAt(Date.now());
      setStatus("ok");
    } catch {
      setStatus("error");
      setError(copy.contactError);
    }
  }

  return (
    <section
      id="contact"
      className="border-t site-rule bg-paper-deep"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-2xl">
          <h2
            id="contact-heading"
            className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-navy"
          >
            {copy.contactTitle}
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-ink-soft">
            {copy.contactBody}
          </p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-8 grid max-w-2xl gap-4"
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label={copy.contactKind}>
            <button
              type="button"
              onClick={() => setKind("suggestion")}
              className={
                kind === "suggestion"
                  ? "bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper"
                  : "border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
              }
            >
              {copy.contactKindSuggestion}
            </button>
            <button
              type="button"
              onClick={() => setKind("contact")}
              className={
                kind === "contact"
                  ? "bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper"
                  : "border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
              }
            >
              {copy.contactKindContact}
            </button>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
              {copy.contactName}
            </span>
            <input
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
              {copy.contactEmail}{" "}
              <span className="normal-case tracking-normal">
                ({copy.contactOptional})
              </span>
            </span>
            <input
              name="email"
              type="email"
              maxLength={120}
              autoComplete="email"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
              {copy.contactMessage}
            </span>
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 outline-none focus:border-accent resize-y"
            />
          </label>

          {/* Honeypot - hidden from humans */}
          <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <span>Website</span>
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-navy px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-paper hover:bg-navy/90 disabled:opacity-60"
            >
              {status === "sending" ? copy.contactSending : copy.contactSubmit}
            </button>
            {status === "ok" ? (
              <p className="text-sm text-ink">{copy.contactSuccess}</p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-accent-deep">{error || copy.contactError}</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
