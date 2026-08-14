#!/usr/bin/env python3
"""
Re-translate FR fields that are still English copies.
Also normalizes paragraph breaks (\\n → \\n\\n).
Resumes via content/.translate-fr-progress.json
"""

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


def normalize_paragraphs(text: str) -> str:
    if not text:
        return text
    out = text.replace("\r\n", "\n").replace("\u2014", "-").replace("\u2013", "-")
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    out = re.sub(r"([^\n])\n(?!\n)([^\n])", r"\1\n\n\2", out)
    return out.strip() + "\n"


def has_french_marks(text: str) -> bool:
    return bool(re.search(r"[àâäéèêëïîôùûüçœ]", text or "", re.I))


def is_englishish(text: str) -> bool:
    s = text or ""
    if has_french_marks(s[:1200]):
        return False
    fr = len(
        re.findall(
            r"\b(le|la|les|des|une|un|dans|pour|avec|sur|qui|que|est|ont|été|cette|ces|aux|du|au|par)\b",
            s.lower(),
        )
    )
    en = len(
        re.findall(
            r"\b(the|and|with|that|from|has|have|will|said|for|of|to|in|a|an|was|were|been)\b",
            s.lower(),
        )
    )
    return en >= 8 and fr < 6


def translate_text(text: str, retries: int = 6) -> str:
    text = (text or "").strip()
    if not text:
        return text
    # Prefer paragraph-aware chunks
    text = normalize_paragraphs(text).strip()
    if len(text) <= 4500:
        return normalize_paragraphs(_call(text, retries))
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
    return normalize_paragraphs("\n\n".join(out))


def _call(text: str, retries: int) -> str:
    for attempt in range(retries):
        try:
            result = translator.translate(text)
            time.sleep(0.12)
            return result or text
        except Exception as exc:  # noqa: BLE001
            wait = 1.5 * (attempt + 1)
            print(f"  retry {attempt + 1}: {exc}", flush=True)
            time.sleep(wait)
    return text


def load_progress() -> dict:
    if PROGRESS.exists():
        return json.loads(PROGRESS.read_text())
    return {}


def needs_retranslate(item: dict, done: dict) -> bool:
    title = item.get("title") or ""
    title_en = item.get("title_en") or ""
    body_fr = item.get("body_fr") or ""
    body_en = item.get("body_en") or ""
    if body_fr.strip() == body_en.strip() and body_en.strip():
        return True
    if title.strip() == title_en.strip() and title_en.strip() and not has_french_marks(title):
        return True
    if is_englishish(body_fr) or is_englishish(title):
        return True
    return False


def main() -> None:
    limit = None
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])
    only_slug = None
    if len(sys.argv) > 1 and not sys.argv[1].isdigit():
        only_slug = sys.argv[1]

    items = json.loads(SEED.read_text())
    done = load_progress()

    # Always normalize EN/FR paragraphs for all items first
    para_fixed = 0
    for item in items:
        for key in ("body_en", "body_fr"):
            fixed = normalize_paragraphs(item.get(key, ""))
            if fixed != item.get(key):
                item[key] = fixed
                para_fixed += 1
    print(f"paragraph fields normalized={para_fixed}", flush=True)

    remaining = [it for it in items if needs_retranslate(it, done)]
    if only_slug:
        remaining = [it for it in remaining if it["slug"] == only_slug]
        if not remaining:
            remaining = [it for it in items if it["slug"] == only_slug]
    if limit is not None:
        remaining = remaining[:limit]

    print(
        f"total={len(items)} to_translate={len(remaining)} progress={len(done)}",
        flush=True,
    )

    for i, item in enumerate(remaining, 1):
        slug = item["slug"]
        print(f"[{i}/{len(remaining)}] {slug}", flush=True)
        source_title = item.get("title_en") or item.get("title") or ""
        source_excerpt = item.get("excerpt_en") or item.get("excerpt") or ""
        source_body = item.get("body_en") or item.get("body_fr") or ""

        title_fr = translate_text(source_title)
        excerpt_fr = translate_text(source_excerpt)
        body_fr = translate_text(source_body)
        payload = {
            "title": title_fr.replace("\u2014", "-").replace("\u2013", "-"),
            "excerpt": excerpt_fr.replace("\u2014", "-").replace("\u2013", "-"),
            "body_fr": body_fr,
            "coverImageAltFr": f"Illustration - {title_fr}".replace("\u2014", "-"),
        }
        done[slug] = payload
        item.update(payload)
        PROGRESS.write_text(json.dumps(done, ensure_ascii=False, indent=2))

        if i % 3 == 0 or i == len(remaining):
            SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
            print(f"  checkpoint seed ({i}/{len(remaining)})", flush=True)

    SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print("done", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        sys.exit(130)
