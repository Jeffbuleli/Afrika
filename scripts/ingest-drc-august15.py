#!/usr/bin/env python3
"""Ingest DRC August 1-15 REPORT into seed-all.json (EN+FR), replace emdashes,
download Wikimedia HD covers, mark homepage showcase featured articles.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "content" / "shinta-august" / "DRC_August_15_REPORT.txt"
SEED = ROOT / "content" / "seed-all.json"
COVERS = ROOT / "public" / "covers"
OUT_META = ROOT / "content" / "shinta-august" / "seed-meta-august15.json"
MCBULELI_ENV = Path("/Users/mac/Documents/McBuleliP2P/.env")
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

# Showcase slugs (matched after slugify) get featured=true + curated cover queries
FEATURED_TITLE_HINTS = [
    "South Kivu Clears Ebola",
    "Airtel Africa Launches",
    "Referendum Law Sent Back",
    "Rwanda Challenges MONUSCO",
    "Mining Local-Shareholding",
    "Mukwege Urges Special Tribunal",
    "Twin Ibanda Fires",
    "Governor Bilolo Tours",
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

# Query → preferred Wikimedia search for covers (people/places/objects)
COVER_QUERIES = [
    ("ebola", "Ebola virus Congo health workers PPE"),
    ("starlink|airtel|satellite", "Starlink satellite dish antenna"),
    ("measles|vaccin|immunis", "vaccination campaign Africa children"),
    ("cholera", "cholera water treatment Africa"),
    ("fayulu|vehicle|controle|technical check", "Kinshasa Boulevard du 30 juin traffic"),
    ("united nations|arria|new york|security council", "Headquarters of the United Nations New York"),
    ("bilolo|scam|tshela|kongo-central", "Mayombe Congo rainforest landscape"),
    ("beni|ville morte|mutsuva", "Beni Nord-Kivu Congo street"),
    ("dinacope|teacher|schooling|enseignant", "school classroom Democratic Republic of the Congo"),
    ("bandundu|rn17", "Bandundu Congo road landscape"),
    ("walikale", "Walikale North Kivu mining landscape"),
    ("ibanda|fire|incendie|bukavu", "Bukavu South Kivu cityscape"),
    ("tshisekedi|referendum|dialogue", "Felix Tshisekedi"),
    ("mukwege", "Denis Mukwege"),
    ("kagame|rwanda", "Paul Kagame"),
    ("monusco|fdlr", "MONUSCO peacekeepers Congo"),
    ("goma|m23|afc", "Goma Lake Kivu"),
    ("mining|cobalt|uranium|cmoc", "cobalt mining Congo"),
    ("kinshasa", "Kinshasa Gombe skyline"),
    ("butembo|katwa|neurosurgeon", "Butembo North Kivu"),
    ("maluku|boat|bateau|port", "Congo River boat Kinshasa"),
    ("justice|tribunal|court", "Palais de justice Kinshasa"),
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
    # "Kinshasa, DRC, August 12, 2026 —" or "August 5, 2026 -"
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
        sec = re.match(r"^1\.\s*(.+)$", line.replace("\t", " ").strip())
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
                    r"^1\.\s*", raw.replace("\t", " ").strip()
                ):
                    break
                if raw.startswith("DRC, Aug") or raw.startswith("REPORT ON"):
                    i += 1
                    continue
                paras.append(hyphenate(nxt.rstrip()))
                i += 1
            # trim leading/trailing blanks
            while paras and not paras[0].strip():
                paras.pop(0)
            while paras and not paras[-1].strip():
                paras.pop()
            body_en = "\n".join(paras).strip()
            body_en = re.sub(r"\n{3,}", "\n\n", body_en)
            # paragraph-normalize single newlines between sentences blocks
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
                    "country": "DRC",
                    "publishedAt": parse_dateline_iso(body_en),
                    "source": "DRC_August_15_REPORT.txt",
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
        "Datelines: Kinshasa, August 12, 2026 - ... → Kinshasa, le 12 août 2026 - ..."
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
            time.sleep(1.2 * (attempt + 1))
            last = exc
    raise RuntimeError(f"translate failed: {last}")


def wikimedia_search(query: str, limit: int = 5) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrlimit": str(limit),
            "gsrnamespace": "6",
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1600",
        }
    )
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    req = urllib.request.Request(
        url, headers={"User-Agent": "AfricaInsightBot/1.0 (editorial covers)"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for page in pages.values():
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        mime = (info.get("mime") or "").lower()
        if "image/" not in mime or "svg" in mime:
            continue
        thumb = info.get("thumburl") or info.get("url")
        if not thumb:
            continue
        out.append(
            {
                "title": page.get("title", ""),
                "url": thumb,
                "width": info.get("thumbwidth") or info.get("width") or 0,
            }
        )
    return out


def safe_cover_name(title: str) -> str:
    base = title.replace("File:", "").replace(" ", "_")
    base = re.sub(r"[^\w.\-]+", "_", base)
    if len(base) > 90:
        base = base[:90]
    if not base.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        base += ".jpg"
    return base


def download_cover(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 20_000:
        return True
    req = urllib.request.Request(
        url, headers={"User-Agent": "AfricaInsightBot/1.0 (editorial covers)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        if len(data) < 8_000:
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def pick_cover_for_article(title: str, body: str, existing: list[str]) -> str:
    blob = f"{title} {body[:800]}".lower()
    query = "Democratic Republic of the Congo landscape"
    for pattern, q in COVER_QUERIES:
        if re.search(pattern, blob, re.I):
            query = q
            break
    # Prefer existing local covers by keyword
    for path in existing:
        name = path.lower()
        if "tshisekedi" in blob and "tshisekedi" in name:
            return path
        if "goma" in blob and "goma" in name:
            return path
        if "bukavu" in blob and "bukavu" in name:
            return path
        if "kinshasa" in blob and "kinshasa" in name:
            return path
        if "beni" in blob and "beni" in name:
            return path
        if ("united nations" in blob or "new york" in blob) and "united_nations" in name:
            return path
        if "kagame" in blob and "kagame" in name:
            return path
    # Download fresh Wikimedia HD
    try:
        hits = wikimedia_search(query, limit=6)
    except Exception:
        hits = []
    for hit in hits:
        fname = safe_cover_name(hit["title"] or hashlib.md5(hit["url"].encode()).hexdigest())
        dest = COVERS / fname
        if download_cover(hit["url"], dest):
            return f"/covers/{fname}"
    # fallbacks
    for fb in (
        "/covers/1280px-La_Gombe__Kinshasa__RDC.jpg",
        "/covers/Goma__Lake_Kivu__DRC__Zaire_-_Congo__Photo_by_Sascha_Grabow.jpg",
        "/covers/Bukavu__DR_congo__2021.jpg",
        "/covers/F_lix_Tshisekedi_in_2021.jpg",
    ):
        if (ROOT / "public" / fb.lstrip("/")).exists() or fb.startswith("/covers/"):
            return fb
    return "/covers/1280px-La_Gombe__Kinshasa__RDC.jpg"


def is_featured(title: str) -> bool:
    t = title.lower()
    return any(h.lower() in t for h in FEATURED_TITLE_HINTS)


def main() -> None:
    api_key, base, model = openai_cfg()
    COVERS.mkdir(parents=True, exist_ok=True)
    raw = REPORT.read_text(encoding="utf-8")
    items = parse_report(raw)
    print(f"parsed {len(items)} articles", flush=True)
    existing_covers = [
        f"/covers/{p.name}" for p in COVERS.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    ]

    # Translate FR (bounded concurrency)
    translated: list[dict] = [None] * len(items)  # type: ignore

    def work(idx: int, item: dict):
        fr = openai_translate(api_key, base, model, item)
        return idx, fr

    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = [pool.submit(work, i, it) for i, it in enumerate(items)]
        done = 0
        for fut in as_completed(futs):
            idx, fr = fut.result()
            translated[idx] = fr
            done += 1
            if done % 5 == 0 or done == len(items):
                print(f"translated {done}/{len(items)}", flush=True)

    seed_new: list[dict] = []
    used_slugs: set[str] = set()
    for i, item in enumerate(items):
        fr = translated[i]
        slug = slugify(item["title_en"])
        base_slug = slug
        n = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        used_slugs.add(slug)
        image = pick_cover_for_article(item["title_en"], item["body_en"], existing_covers)
        if image not in existing_covers:
            existing_covers.append(image)
        feat = is_featured(item["title_en"])
        art = {
            "slug": slug,
            "category": item["category"],
            "featured": feat,
            "rank": 10 if feat else 50,
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
            "country": "DRC",
            "source": item["source"],
            "coverImageAltFr": fr["title"],
            "coverImageAltEn": item["title_en"],
        }
        # final hyphen scrub
        for k in ("title", "excerpt", "title_en", "excerpt_en", "body_en", "body_fr"):
            art[k] = hyphenate(art[k])
        seed_new.append(art)

    OUT_META.write_text(json.dumps(seed_new, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_META}", flush=True)

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    # remove prior august15 ingest if re-run
    before = len(seed)
    seed = [a for a in seed if a.get("source") != "DRC_August_15_REPORT.txt"]
    # demote a few old featured so August lead wins homepage for DRC freshness
    for a in seed:
        if a.get("featured") and a.get("country") == "DRC":
            pub = a.get("publishedAt") or ""
            if pub < "2026-08-01":
                a["featured"] = False
    seed.extend(seed_new)
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"seed {before} -> {len(seed)} (+{len(seed_new)} august, featured={sum(1 for a in seed_new if a['featured'])})",
        flush=True,
    )


if __name__ == "__main__":
    main()
