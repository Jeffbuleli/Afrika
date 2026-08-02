#!/usr/bin/env python3
"""Translate seed-all.json EN → FR (title, excerpt, body) with resume support."""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
PROGRESS = ROOT / "content" / ".translate-fr-progress.json"

translator = GoogleTranslator(source="en", target="fr")


def translate_text(text: str, retries: int = 5) -> str:
    text = (text or "").strip()
    if not text:
        return text
    if len(text) <= 4500:
        return _call(text, retries)
    # Chunk by paragraphs under limit
    paras = re.split(r"(\n{2,})", text)
    out: list[str] = []
    buf = ""
    for part in paras:
        if len(buf) + len(part) <= 4500:
            buf += part
            continue
        if buf.strip():
            out.append(_call(buf.strip(), retries))
        if len(part) <= 4500:
            buf = part
        else:
            for i in range(0, len(part), 4000):
                piece = part[i : i + 4000].strip()
                if piece:
                    out.append(_call(piece, retries))
            buf = ""
    if buf.strip():
        out.append(_call(buf.strip(), retries))
    return "\n\n".join(out)


def _call(text: str, retries: int) -> str:
    for attempt in range(retries):
        try:
            result = translator.translate(text)
            time.sleep(0.08)
            return result or text
        except Exception as exc:  # noqa: BLE001
            wait = 1.2 * (attempt + 1)
            print(f"  retry {attempt + 1}: {exc}", flush=True)
            time.sleep(wait)
    return text


def load_progress() -> dict:
    if PROGRESS.exists():
        return json.loads(PROGRESS.read_text())
    return {}


def main() -> None:
    items = json.loads(SEED.read_text())
    done = load_progress()
    # Resume only when a full body translation exists
    remaining = [
        it
        for it in items
        if not (done.get(it["slug"]) or {}).get("body_fr")
    ]
    print(
        f"total={len(items)} already={sum(1 for v in done.values() if v.get('body_fr'))} remaining={len(remaining)}",
        flush=True,
    )

    for i, item in enumerate(remaining, 1):
        slug = item["slug"]
        print(f"[{i}/{len(remaining)}] {slug}", flush=True)
        title_fr = translate_text(item["title_en"])
        excerpt_fr = translate_text(item["excerpt_en"])
        body_fr = translate_text(item["body_en"])
        done[slug] = {
            "title": title_fr,
            "excerpt": excerpt_fr,
            "body_fr": body_fr.rstrip() + "\n",
            "coverImageAltFr": title_fr,
        }
        PROGRESS.write_text(json.dumps(done, ensure_ascii=False, indent=2))
        item.update(done[slug])
        if i % 5 == 0 or i == len(remaining):
            SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
            # Live DB sync so the site picks up translations without full reseed
            try:
                import sqlite3

                conn = sqlite3.connect(ROOT / "data" / "africa-insight.db")
                cur = conn.cursor()
                cur.execute(
                    """
                    UPDATE article_translations
                    SET title=?, excerpt=?, body=?, seo_title=?, seo_description=?
                    WHERE locale='fr' AND article_id=(SELECT id FROM articles WHERE slug=?)
                    """,
                    (
                        title_fr,
                        excerpt_fr,
                        body_fr.rstrip() + "\n",
                        title_fr,
                        excerpt_fr,
                        slug,
                    ),
                )
                # also flush last 4 from this batch
                for prev in remaining[max(0, i - 5) : i]:
                    p = done.get(prev["slug"])
                    if not p:
                        continue
                    cur.execute(
                        """
                        UPDATE article_translations
                        SET title=?, excerpt=?, body=?, seo_title=?, seo_description=?
                        WHERE locale='fr' AND article_id=(SELECT id FROM articles WHERE slug=?)
                        """,
                        (
                            p["title"],
                            p["excerpt"],
                            p["body_fr"],
                            p["title"],
                            p["excerpt"],
                            prev["slug"],
                        ),
                    )
                conn.commit()
                conn.close()
            except Exception as exc:  # noqa: BLE001
                print(f"  db sync warn: {exc}", flush=True)
            print(f"  checkpoint ({len(done)}/{len(items)})", flush=True)

    for item in items:
        if item["slug"] in done:
            item.update(done[item["slug"]])
    SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print("done", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        sys.exit(130)
