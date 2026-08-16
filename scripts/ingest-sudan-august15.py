#!/usr/bin/env python3
"""Ingest Sudan August 1-15 REPORT into seed-all.json (EN+FR), contextual local covers."""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "content" / "shinta-august" / "SUDAN_August_15_REPORT.txt"
SEED = ROOT / "content" / "seed-all.json"
COVERS = ROOT / "public" / "covers"
OUT_META = ROOT / "content" / "shinta-august" / "seed-meta-sudan-august15.json"
MCBULELI_ENV = Path("/Users/mac/Documents/McBuleliP2P/.env")
SOURCE = "SUDAN_August_15_REPORT.txt"
MODEL = os.environ.get("OPENAI_TRANSLATE_MODEL") or "gpt-4o-mini"

SECTION_CAT = {
    "Politics and Diplomacy": "politique",
    "Economy and Tech.": "economie",
    "Economy and Tech": "economie",
    "Social and Health": "societe",
    "Justice and Rights": "justice",
    "Security and Humanitarian Affairs": "securite",
}
AUTHOR_BY_CAT = {
    "politique": "amina-kabasele",
    "securite": "amina-kabasele",
    "economie": "jean-marc-okito",
    "societe": "sarah-ndaya",
    "justice": "amina-kabasele",
}

FEATURED_HINTS = [
    "Burhan Dialogue",
    "RSF",
    "El Fasher",
    "Port Sudan",
    "Blue Nile",
    "Humanitarian",
    "Darfur",
]

MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

COVER_POOLS: dict[str, list[str]] = {
    "burhan": [
        "/covers/1280px-Chairman_of_the_Sovereignty_Council_of_Sudan_Abdel_Fa_55de66e285.jpg",
        "/covers/1280px-Ilham_Aliyev_met_with_Chairman_of_Sovereign_Council_o_aecfde07e9.jpg",
    ],
    "khartoum": [
        "/covers/Khartoum.jpg",
        "/covers/1280px-Al_Taif__Khartoum__Sudan_-_panoramio.jpg",
        "/covers/The_Nile_Khartoum_Bahri.jpg",
        "/covers/1280px-The_Blue_Nile_in_Khartoum.jpg",
        "/covers/1280px-Sudan._Khartoum._Bridge_across_Blue_Nile_from_Khartou_551d47473a.jpg",
        "/covers/1280px-Sudan_Development_Corporation_Khartoum_Sudan_Designed_4dde463bdf.jpg",
        "/covers/1280px-Sudan_Development_Corporation_Khartoum_Sudan_Designed_95b81ced0d.jpg",
        "/covers/1280px-Sudan_Development_Corporation_Khartoum_Sudan_Designed_ea4a3fe4cc.jpg",
    ],
    "nile": [
        "/covers/1280px-The_Blue_Nile_in_Khartoum.jpg",
        "/covers/1280px-A_boat_on_the_Blue_Nile.jpg",
        "/covers/The_Nile_Khartoum_Bahri.jpg",
        "/covers/1280px-Sudan._Khartoum._Bridge_across_Blue_Nile_from_Khartou_551d47473a.jpg",
    ],
    "un": [
        "/covers/1280px-Headquarters_of_the_United_Nations__New_York_City__20231001_1103_1006.jpg",
    ],
    "securite": [
        "/covers/Khartoum.jpg",
        "/covers/1280px-Al_Taif__Khartoum__Sudan_-_panoramio.jpg",
        "/covers/The_Nile_Khartoum_Bahri.jpg",
        "/covers/1280px-The_Blue_Nile_in_Khartoum.jpg",
        "/covers/1280px-A_boat_on_the_Blue_Nile.jpg",
    ],
}

COVER_RULES: list[tuple[str, list[str]]] = [
    ("burhan", [r"\bburhan\b", r"\bal-burhan\b", r"\bsovereign council\b"]),
    ("un", [r"\bunited nations\b", r"\bun (warn|says|meeting|response)\b", r"\bonu\b", r"\bicj\b"]),
    ("nile", [r"\bblue nile\b", r"\bnile\b", r"\bport sudan\b", r"\bred sea\b", r"\bmaritime\b"]),
    ("khartoum", [r"\bkhartoum\b", r"\bomdurman\b", r"\bdialogue\b", r"\beconomy\b", r"\bbank\b"]),
]


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


def openai_cfg():
    env = {}
    env.update(load_dotenv(ROOT / ".env"))
    env.update(load_dotenv(MCBULELI_ENV))
    env.update({k: v for k, v in os.environ.items() if k.startswith("OPENAI_")})
    key = (env.get("OPENAI_API_KEY") or "").strip()
    base = (env.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = (env.get("OPENAI_TRANSLATE_MODEL") or MODEL).strip()
    if not key:
        raise SystemExit("OPENAI_API_KEY missing")
    return key, base, model


def hyphenate(text: str) -> str:
    return (
        (text or "")
        .replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("—", "-")
        .replace("–", "-")
    )


def slugify(title: str) -> str:
    s = unicodedata.normalize("NFKD", title)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    if len(s) > 72:
        s = s[:72].rstrip("-")
        h = hashlib.sha1(title.encode()).hexdigest()[:6]
        s = f"{s}-{h}"
    return s or f"article-{hashlib.sha1(title.encode()).hexdigest()[:10]}"


def reading_minutes(body: str) -> int:
    words = len(re.findall(r"\w+", body or ""))
    return max(2, min(12, round(words / 220) or 3))


def parse_dateline_iso(body: str, fallback_day: int = 15) -> str:
    m = re.search(
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*2026",
        body,
        re.I,
    )
    if m:
        month = MONTHS[m.group(1).lower()]
        day = int(m.group(2))
        hour = 8 + (day % 10)
        return datetime(2026, month, day, hour, 0, 0, tzinfo=timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%S.000Z"
        )
    return datetime(2026, 8, fallback_day, 12, 0, 0, tzinfo=timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%S.000Z"
    )


def parse_report(text: str) -> list[dict]:
    text = hyphenate(text)
    lines = text.splitlines()
    section = "politique"
    articles: list[dict] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        sec = re.match(r"^\d+\.\s*(.+)$", line.replace("\t", " ").strip())
        if sec:
            label = sec.group(1).strip()
            section = SECTION_CAT.get(label, section)
            i += 1
            continue
        if line.startswith("*"):
            title_en = hyphenate(line[1:].strip())
            i += 1
            paras: list[str] = []
            while i < len(lines):
                nxt = lines[i]
                raw = nxt.strip()
                if raw.startswith("*") or re.match(
                    r"^\d+\.\s*", raw.replace("\t", " ").strip()
                ):
                    break
                if raw.startswith("Sudan, Aug") or raw.startswith("REPORT ON"):
                    i += 1
                    continue
                paras.append(hyphenate(nxt.rstrip()))
                i += 1
            while paras and not paras[0].strip():
                paras.pop(0)
            while paras and not paras[-1].strip():
                paras.pop()
            body_en = "\n".join(paras).strip()
            body_en = re.sub(r"\n{3,}", "\n\n", body_en)
            body_en = re.sub(r"([^\n])\n(?!\n)([^\n])", r"\1\n\n\2", body_en)
            body_en = hyphenate(body_en)
            first = body_en.split("\n\n", 1)[0].strip()
            excerpt_en = first if len(first) < 320 else first[:317].rstrip() + "…"
            articles.append(
                {
                    "title_en": title_en,
                    "excerpt_en": excerpt_en,
                    "body_en": body_en,
                    "category": section,
                    "author": AUTHOR_BY_CAT.get(section, "amina-kabasele"),
                    "country": "SUDAN",
                    "publishedAt": parse_dateline_iso(body_en),
                    "source": SOURCE,
                }
            )
            continue
        i += 1
    return articles


def openai_translate(api_key: str, base: str, model: str, item: dict) -> dict:
    system = (
        "You are a professional news translator for Africa Insight. "
        "Translate English into natural journalistic French. "
        "Output JSON only with keys title, excerpt, body_fr. "
        "Use ASCII hyphen '-' only (never em dash). "
        "Preserve names, acronyms, numbers. "
        "Datelines: Khartoum, August 12, 2026 - ... → Khartoum, le 12 août 2026 - ..."
    )
    user = json.dumps(
        {
            "title_en": item["title_en"],
            "excerpt_en": item["excerpt_en"],
            "body_en": item["body_en"],
        },
        ensure_ascii=False,
    )
    payload = {
        "model": model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    last: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {
                "title": hyphenate(parsed.get("title") or item["title_en"]),
                "excerpt": hyphenate(parsed.get("excerpt") or item["excerpt_en"]),
                "body_fr": hyphenate(parsed.get("body_fr") or item["body_en"]),
            }
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"translate failed: {last}")


def exists_cover(path: str) -> bool:
    return (ROOT / "public" / path.lstrip("/")).exists()


def filter_pools() -> dict[str, list[str]]:
    out = {}
    for key, paths in COVER_POOLS.items():
        out[key] = [p for p in paths if exists_cover(p)]
    return out


def pick_cover(title: str, body: str, category: str, slug: str, usage: dict[str, int], pools: dict[str, list[str]]) -> str:
    blob = f"{title}\n{body[:1000]}\n{category}".lower()
    pool_key = "khartoum"
    for key, pats in COVER_RULES:
        if any(re.search(p, blob, re.I) for p in pats):
            pool_key = key
            break
    if category == "securite" and pool_key == "khartoum":
        pool_key = "securite"
    pool = pools.get(pool_key) or pools.get("khartoum") or ["/covers/Khartoum.jpg"]
    ranked = sorted(
        pool,
        key=lambda p: (usage.get(p, 0), hashlib.md5((slug + p).encode()).hexdigest()),
    )
    return ranked[0]


def is_featured(title: str) -> bool:
    t = title.lower()
    return any(h.lower() in t for h in FEATURED_HINTS)


def alt_for(path: str, locale: str, title: str) -> str:
    name = Path(path).stem.replace("_", " ").replace("1280px-", "")
    name = re.sub(r"\s+", " ", name).strip()
    if locale == "fr":
        return f"Illustration - {name}" if name else title
    return f"Cover - {name}" if name else title


def main() -> None:
    api_key, base, model = openai_cfg()
    COVERS.mkdir(parents=True, exist_ok=True)
    pools = filter_pools()
    items = parse_report(REPORT.read_text(encoding="utf-8"))
    print(f"parsed {len(items)} articles", flush=True)

    translated: list[dict | None] = [None] * len(items)

    def work(idx: int, item: dict):
        return idx, openai_translate(api_key, base, model, item)

    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = [pool.submit(work, i, it) for i, it in enumerate(items)]
        done = 0
        for fut in as_completed(futs):
            idx, fr = fut.result()
            translated[idx] = fr
            done += 1
            if done % 5 == 0 or done == len(items):
                print(f"translated {done}/{len(items)}", flush=True)

    usage: dict[str, int] = defaultdict(int)
    seed_new: list[dict] = []
    used_slugs: set[str] = set()
    for i, item in enumerate(items):
        fr = translated[i]
        assert fr is not None
        slug = slugify(item["title_en"])
        base_slug = slug
        n = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        used_slugs.add(slug)
        image = pick_cover(
            item["title_en"], item["body_en"], item["category"], slug, usage, pools
        )
        usage[image] += 1
        feat = is_featured(item["title_en"])
        art = {
            "slug": slug,
            "category": item["category"],
            "featured": feat,
            "rank": 11 if feat else 52,
            "publishedAt": item["publishedAt"],
            "image": image,
            "title": fr["title"],
            "excerpt": fr["excerpt"],
            "title_en": item["title_en"],
            "excerpt_en": item["excerpt_en"],
            "body_en": item["body_en"],
            "body_fr": fr["body_fr"],
            "readingTimeMinutes": reading_minutes(item["body_en"]),
            "author": item["author"],
            "country": "SUDAN",
            "source": SOURCE,
            "coverImageAltFr": alt_for(image, "fr", fr["title"]),
            "coverImageAltEn": alt_for(image, "en", item["title_en"]),
        }
        for k in ("title", "excerpt", "title_en", "excerpt_en", "body_en", "body_fr"):
            art[k] = hyphenate(art[k])
        seed_new.append(art)

    OUT_META.write_text(json.dumps(seed_new, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_META}", flush=True)

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    before = len(seed)
    seed = [a for a in seed if a.get("source") != SOURCE]
    for a in seed:
        if a.get("featured") and a.get("country") == "SUDAN":
            pub = a.get("publishedAt") or ""
            if pub < "2026-08-01":
                a["featured"] = False
    seed.extend(seed_new)
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"seed {before} -> {len(seed)} (+{len(seed_new)} sudan, featured={sum(1 for a in seed_new if a['featured'])}, unique_images={len(usage)})",
        flush=True,
    )


if __name__ == "__main__":
    main()
