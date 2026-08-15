#!/usr/bin/env python3
"""
Re-translate FR fields that are still English copies.
Primary: OpenAI API (McBuleli OPENAI_API_KEY).
Also normalizes paragraph breaks (\\n → \\n\\n).
Resumes via content/.translate-fr-progress.json
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
PROGRESS = ROOT / "content" / ".translate-fr-progress.json"
MCBULELI_ENV = Path("/Users/mac/Documents/McBuleliP2P/.env")
AFRIKA_ENV = ROOT / ".env"

# Bulk MT: prefer a fast cheap model. Override with OPENAI_TRANSLATE_MODEL.
DEFAULT_TRANSLATE_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are a professional news translator for Africa Insight (African politics, security, economy).
Translate English into natural journalistic French (France/Belgium/Africa press style).
Rules:
- Output valid JSON only with keys: title, excerpt, body_fr
- Preserve proper nouns, acronyms (FARDC, MONUSCO, AFC/M23, JNIM, RDF, etc.), places, dates, numbers, quotes meaning
- Keep paragraph breaks (blank lines) in body_fr
- Use ASCII hyphen "-" only (never em dash — or en dash –)
- Do not add commentary, notes, or markdown fences
- Datelines like "Kinshasa, July 6, 2026 - ..." become "Kinshasa, le 6 juillet 2026 - ..."
"""


def load_dotenv(path: Path) -> dict:
    out: dict = {}
    if not path.exists():
        return out
    for line in path.read_text(errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def resolve_openai_config() -> tuple:
    env = {}
    env.update(load_dotenv(AFRIKA_ENV))
    env.update(load_dotenv(MCBULELI_ENV))  # McBuleli wins for shared credits
    env.update({k: v for k, v in os.environ.items() if k.startswith("OPENAI_")})
    api_key = (env.get("OPENAI_API_KEY") or "").strip()
    base_url = (env.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    # Speed first for overnight bulk; allow override
    model = (
        (env.get("OPENAI_TRANSLATE_MODEL") or "").strip()
        or DEFAULT_TRANSLATE_MODEL
        or (env.get("OPENAI_MODEL") or "").strip()
    )
    if not api_key:
        raise SystemExit("OPENAI_API_KEY missing (expected in McBuleli .env)")
    return api_key, base_url, model


API_KEY, BASE_URL, MODEL = resolve_openai_config()


def uses_responses_api(model: str) -> bool:
    m = (model or "").strip().lower()
    return m.startswith("gpt-5") or m.startswith("o3") or m.startswith("o4")


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


class TranslateFailed(Exception):
    """Raised when OpenAI translation keeps failing after retries."""


def _extract_text_from_responses(data: dict) -> str:
    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        return data["output_text"]
    output = data.get("output")
    chunks: list[str] = []
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "output_text":
                        t = part.get("text")
                        if isinstance(t, str):
                            chunks.append(t)
    return "".join(chunks)


def _parse_json_payload(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise TranslateFailed("OpenAI returned non-object JSON")
    return data


def openai_translate_article(
    title: str, excerpt: str, body: str, retries: int = 5
) -> dict:
    user = json.dumps(
        {
            "title": title or "",
            "excerpt": excerpt or "",
            "body_en": normalize_paragraphs(body or "").strip(),
        },
        ensure_ascii=False,
    )
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    last_exc: Exception | None = None

    for attempt in range(retries):
        try:
            with httpx.Client(timeout=120.0) as client:
                if uses_responses_api(MODEL):
                    res = client.post(
                        f"{BASE_URL}/responses",
                        headers=headers,
                        json={
                            "model": MODEL,
                            "instructions": SYSTEM_PROMPT,
                            "input": user,
                            "temperature": 0.2,
                            "text": {"format": {"type": "json_object"}},
                        },
                    )
                    if res.status_code >= 400:
                        raise TranslateFailed(
                            f"responses {res.status_code}: {res.text[:240]}"
                        )
                    raw = _extract_text_from_responses(res.json())
                else:
                    res = client.post(
                        f"{BASE_URL}/chat/completions",
                        headers=headers,
                        json={
                            "model": MODEL,
                            "temperature": 0.2,
                            "response_format": {"type": "json_object"},
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": user},
                            ],
                        },
                    )
                    if res.status_code >= 400:
                        raise TranslateFailed(
                            f"chat {res.status_code}: {res.text[:240]}"
                        )
                    raw = res.json()["choices"][0]["message"]["content"]

            data = _parse_json_payload(raw)
            title_fr = str(data.get("title") or "").strip()
            excerpt_fr = str(data.get("excerpt") or "").strip()
            body_fr = str(data.get("body_fr") or data.get("body") or "").strip()
            if not title_fr or not body_fr:
                raise TranslateFailed("missing title/body_fr in OpenAI JSON")
            return {
                "title": title_fr.replace("\u2014", "-").replace("\u2013", "-"),
                "excerpt": excerpt_fr.replace("\u2014", "-").replace("\u2013", "-"),
                "body_fr": normalize_paragraphs(body_fr),
            }
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            wait = min(30.0, 1.5 * (2**attempt))
            print(
                f"  retry {attempt + 1}/{retries} (wait {wait:.0f}s): {exc}",
                flush=True,
            )
            time.sleep(wait)

    raise TranslateFailed(str(last_exc) if last_exc else "openai translate failed")


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

    print(f"backend=openai model={MODEL} base={BASE_URL}", flush=True)

    items = json.loads(SEED.read_text())
    done = load_progress()

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

    failed = 0
    for i, item in enumerate(remaining, 1):
        slug = item["slug"]
        print(f"[{i}/{len(remaining)}] {slug}", flush=True)
        source_title = item.get("title_en") or item.get("title") or ""
        source_excerpt = item.get("excerpt_en") or item.get("excerpt") or ""
        source_body = item.get("body_en") or item.get("body_fr") or ""

        try:
            translated = openai_translate_article(
                source_title, source_excerpt, source_body
            )
        except TranslateFailed as exc:
            failed += 1
            print(f"  SKIP failed after retries: {exc}", flush=True)
            time.sleep(3)
            continue

        body_fr = translated["body_fr"]
        title_fr = translated["title"]
        excerpt_fr = translated["excerpt"]

        if source_body.strip() and body_fr.strip() == source_body.strip():
            failed += 1
            print("  SKIP still English after translate", flush=True)
            continue
        if is_englishish(body_fr) and not has_french_marks(body_fr):
            failed += 1
            print("  SKIP still englishish after translate", flush=True)
            continue

        payload = {
            "title": title_fr,
            "excerpt": excerpt_fr,
            "body_fr": body_fr,
            "coverImageAltFr": f"Illustration - {title_fr}".replace("\u2014", "-"),
        }
        done[slug] = payload
        item.update(payload)
        PROGRESS.write_text(json.dumps(done, ensure_ascii=False, indent=2))

        if i % 3 == 0 or i == len(remaining):
            SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
            print(f"  checkpoint seed ({i}/{len(remaining)})", flush=True)

    print(f"failed_skipped={failed}", flush=True)
    SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print("done", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        sys.exit(130)
