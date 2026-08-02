"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: number; labelFr: string; slug: string };
type Author = { id: number; name: string };
type Initial = {
  id?: number;
  slug?: string;
  categoryId?: number;
  authorId?: number;
  status?: string;
  featured?: boolean;
  coverImageUrl?: string | null;
  titleFr?: string;
  titleEn?: string;
  excerptFr?: string;
  excerptEn?: string;
  bodyFr?: string;
  bodyEn?: string;
};

export function ArticleForm({
  categories,
  authors,
  initial,
}: {
  categories: Category[];
  authors: Author[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(
    initial?.coverImageUrl || "",
  );

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setCoverImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      id: initial?.id,
      slug: String(form.get("slug") || ""),
      categoryId: Number(form.get("categoryId")),
      authorId: Number(form.get("authorId")),
      status: String(form.get("status") || "draft"),
      featured: form.get("featured") === "on",
      coverImageUrl,
      titleFr: String(form.get("titleFr") || ""),
      titleEn: String(form.get("titleEn") || ""),
      excerptFr: String(form.get("excerptFr") || ""),
      excerptEn: String(form.get("excerptEn") || ""),
      bodyFr: String(form.get("bodyFr") || ""),
      bodyEn: String(form.get("bodyEn") || ""),
    };

    try {
      const res = await fetch("/api/admin/articles", {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1 w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";
  const label = "block text-xs uppercase tracking-[0.14em] text-ink-soft";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error ? (
        <p className="border border-accent/40 bg-paper-deep px-3 py-2 text-sm text-accent-deep">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Slug</span>
          <input
            name="slug"
            defaultValue={initial?.slug}
            className={field}
            placeholder="dialogue-national-enjeux"
          />
        </label>
        <label className="block">
          <span className={label}>Statut</span>
          <select
            name="status"
            defaultValue={initial?.status || "draft"}
            className={field}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
        <label className="block">
          <span className={label}>Rubrique</span>
          <select
            name="categoryId"
            defaultValue={initial?.categoryId || categories[0]?.id}
            className={field}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelFr}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Auteur</span>
          <select
            name="authorId"
            defaultValue={initial?.authorId || authors[0]?.id}
            className={field}
            required
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={Boolean(initial?.featured)}
        />
        À la une
      </label>

      <div>
        <span className={label}>Image de couverture</span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onUpload(e.target.files?.[0] || null)}
          />
          {uploading ? (
            <span className="text-sm text-ink-soft">Upload…</span>
          ) : null}
        </div>
        {coverImageUrl ? (
          <p className="mt-2 break-all text-xs text-ink-soft">{coverImageUrl}</p>
        ) : null}
      </div>

      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-2 text-sm font-medium">Français</legend>
        <label className="block">
          <span className={label}>Titre FR</span>
          <input
            name="titleFr"
            defaultValue={initial?.titleFr}
            className={field}
            placeholder="Dialogue national - les enjeux…"
          />
        </label>
        <label className="block">
          <span className={label}>Chapô FR</span>
          <textarea
            name="excerptFr"
            defaultValue={initial?.excerptFr}
            className={field}
            rows={3}
          />
        </label>
        <label className="block">
          <span className={label}>Corps FR (Markdown)</span>
          <textarea
            name="bodyFr"
            defaultValue={initial?.bodyFr}
            className={`${field} font-mono`}
            rows={12}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-2 text-sm font-medium">English</legend>
        <label className="block">
          <span className={label}>Title EN</span>
          <input
            name="titleEn"
            defaultValue={initial?.titleEn}
            className={field}
            placeholder="National dialogue - the stakes…"
          />
        </label>
        <label className="block">
          <span className={label}>Excerpt EN</span>
          <textarea
            name="excerptEn"
            defaultValue={initial?.excerptEn}
            className={field}
            rows={3}
          />
        </label>
        <label className="block">
          <span className={label}>Body EN (Markdown)</span>
          <textarea
            name="bodyEn"
            defaultValue={initial?.bodyEn}
            className={`${field} font-mono`}
            rows={12}
          />
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent-deep disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
