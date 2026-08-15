#!/usr/bin/env python3
"""Ingest Rwanda August 1-15 REPORT into seed-all.json (EN+FR), varied HD covers."""
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
REPORT = ROOT / "content" / "shinta-august" / "RWANDA_August_15_REPORT.txt"
SEED = ROOT / "content" / "seed-all.json"
COVERS = ROOT / "public" / "covers"
OUT_META = ROOT / "content" / "shinta-august" / "seed-meta-rwanda-august15.json"
MCBULELI_ENV = Path("/Users/mac/Documents/McBuleliP2P/.env")
SOURCE = "RWANDA_August_15_REPORT.txt"
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
    "Nduhungirehe Accuses DRC of",
    "Electric Motorcycles",
    "Toxic Alcohol",
    "Mahama",
    "FDLR Re-enters",
    "Sahle-Work",
    "Industrial Plots",
    "Rutaremara",
]

BANNED_COVER_SUBSTR = (
    "convention_centre",
    "convention_center",
    "kigali_skyline",
    "view_on_kigali",
    "kigali-skyline",
    "kampalaskyline",
    "skyline_of_kampala",
    "la_gombe",
)

COVER_QUERIES = [
    ("nduhungirehe|foreign|genocost|diplomacy", "Olivier Nduhungirehe Rwanda"),
    ("kagame|president of rwanda", "Paul Kagame"),
    ("sahle-work|women|leadership|awln", "Sahle-Work Zewde"),
    ("ndayishimiye|burundi|rwagasore", "Evariste Ndayishimiye"),
    ("talon|benin|senate", "Patrice Talon Benin"),
    ("hichilema|zambia|poll", "Hakainde Hichilema"),
    ("museveni|uganda|easf|nuwagaba|muhoozi", "Yoweri Museveni"),
    ("alcohol|toxic|factory|illicit", "alcohol bottles African market"),
    ("industrial|plots|park|factory|tea|gisakura", "Rwanda tea plantation hills green"),
    ("irrigation|fruit|agriculture", "Rwanda agriculture fields irrigation"),
    ("national parks|communities|conservation", "Volcanoes National Park Rwanda gorilla"),
    ("electric|motorcycle|mobility", "electric motorcycle Africa street"),
    ("commonwealth|sport|medal|football|apr fc|cup", "African football stadium crowd"),
    ("mahama|refugee|malnutrition|breastfeeding", "refugee camp Rwanda children"),
    ("peacekeeper|south sudan|central african|indangamirwa", "Rwanda Defence Force soldiers"),
    ("fdlr|afc|m23|minembwe|twirwaneho|security", "Virunga mountains Rwanda Congo"),
    ("qatar|police|training|military cooperation", "Rwanda police parade"),
    ("sadc|partnership|armenia|poland|ambassador", "Kigali street Rwanda urban people"),
    ("justice|mps|court|prosecution|detainee|doha", "Rwanda parliament"),
    ("signis|priest|catholic|church", "Catholic church Rwanda"),
    ("déby|masra|chad|bangui|french ambassador", "NDjamena Chad"),
    ("biya|cameroon", "Paul Biya"),
    ("kenya|election|iebc", "Nairobi Kenya street"),
    ("besigye|muhoozi|uganda court", "Kampala Uganda market"),
]

MONTHS = {m: i for i, m in enumerate(
    ["january","february","march","april","may","june","july","august","september","october","november","december"], 1)}


def load_dotenv(path: Path) -> dict:
    out = {}
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
    return (text or "").replace("\u2014", "-").replace("\u2013", "-").replace("—", "-").replace("–", "-")


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


def parse_dateline_iso(body: str) -> str:
    m = re.search(
        r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*2026",
        body, re.I,
    )
    if m:
        month = MONTHS[m.group(1).lower()]
        day = int(m.group(2))
        return datetime(2026, month, day, 8 + (day % 10), 0, 0, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    m = re.search(r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+2026", body, re.I)
    if m:
        day, month = int(m.group(1)), MONTHS[m.group(2).lower()]
        return datetime(2026, month, day, 8 + (day % 10), 0, 0, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return datetime(2026, 8, 15, 12, 0, 0, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def fix_merged_title(title: str, body: str) -> tuple[str, str]:
    title = hyphenate(title.strip())
    body = hyphenate(body.strip())
    m = re.match(r"^(.+?[a-z\)\"”'])([A-Z][a-z].+)$", title)
    if m and len(m.group(1)) > 25:
        title, rest = m.group(1).strip(), m.group(2).strip()
        if not body.startswith(rest[:40]):
            body = rest + ("\n\n" + body if body else "")
    title = title.lstrip("*").strip()
    if title.lower().startswith("conclusion"):
        return "", ""
    return title, body


def parse_report(text: str) -> list[dict]:
    text = hyphenate(text)
    lines = text.splitlines()
    section = "politique"
    articles: list[dict] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        for label, cat in SECTION_CAT.items():
            if line == label or line.startswith(label):
                section = cat
                break
        if line.startswith("*"):
            raw_title = line.lstrip("*").strip()
            i += 1
            paras = []
            while i < len(lines):
                nxt = lines[i]
                raw = nxt.strip()
                if raw.startswith("*") or raw in SECTION_CAT or any(raw.startswith(k) for k in SECTION_CAT):
                    break
                if raw.startswith("Rwanda, Aug") or raw.startswith("REPORT ON") or raw.startswith("By Jeff"):
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
            title_en, body_en = fix_merged_title(raw_title, body_en)
            if not title_en or len(body_en) < 80:
                continue
            first = body_en.split("\n\n", 1)[0].strip()
            excerpt_en = first if len(first) < 320 else first[:317].rstrip() + "…"
            articles.append({
                "title_en": title_en,
                "excerpt_en": excerpt_en,
                "body_en": body_en,
                "category": section,
                "author": AUTHOR_BY_CAT.get(section, "amina-kabasele"),
                "country": "RWANDA",
                "publishedAt": parse_dateline_iso(body_en),
                "source": SOURCE,
            })
            continue
        i += 1
    return articles


def openai_translate(api_key, base, model, item):
    system = (
        "You are a professional news translator for Africa Insight. "
        "Translate English into natural journalistic French. "
        "Output JSON only with keys title, excerpt, body_fr. "
        "Use ASCII hyphen '-' only. Preserve names/acronyms/numbers. "
        "Datelines: Kigali, August 4, 2026 - ... → Kigali, le 4 août 2026 - ..."
    )
    user = json.dumps({
        "title_en": item["title_en"],
        "excerpt_en": item["excerpt_en"],
        "body_en": item["body_en"],
    }, ensure_ascii=False)
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
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    last = None
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
        except Exception as exc:
            last = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"translate failed: {last}")


def wikimedia_search(query: str, limit: int = 8) -> list[dict]:
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrlimit": str(limit),
        "gsrnamespace": "6", "prop": "imageinfo", "iiprop": "url|mime|size",
        "iiurlwidth": "1600",
    })
    req = urllib.request.Request(
        f"https://commons.wikimedia.org/w/api.php?{params}",
        headers={"User-Agent": "AfricaInsightBot/1.0 (editorial covers)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    out = []
    for page in (data.get("query") or {}).get("pages") or {}.values():
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        mime = (info.get("mime") or "").lower()
        if "image/" not in mime or "svg" in mime:
            continue
        thumb = info.get("thumburl") or info.get("url")
        title = page.get("title", "")
        if any(b in title.lower().replace(" ", "_") for b in BANNED_COVER_SUBSTR):
            continue
        if thumb:
            out.append({"title": title, "url": thumb})
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
    req = urllib.request.Request(url, headers={"User-Agent": "AfricaInsightBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        if len(data) < 8_000:
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def is_banned(path: str) -> bool:
    n = path.lower()
    return any(b in n for b in BANNED_COVER_SUBSTR)


LOCAL_POOL = [
    "/covers/1280px-Paul_Kagame_MSC_2017.jpg",
    "/covers/1280px-Paul_Kagame_2014.jpg",
    "/covers/1280px-Paul_Kagame__2018-06-13_.jpg",
    "/covers/Ange_Kagame_2014.jpg",
    "/covers/Kivu_Goma_and_Rubavu_On_Rwanda_Side.jpg",
    "/covers/1280px-Virunga_Mountains.jpg",
    "/covers/Virunga_01.jpg",
    "/covers/Mountain_Gorilla__Humba_family____Virunga_National_Park__30_.jpg",
    "/covers/Lake_Kivu.jpg",
    "/covers/1280px-Lava_Lake_Nyiragongo_2.jpg",
]


def pick_cover(title: str, body: str, used: set[str], existing: list[str]) -> str:
    blob = f"{title} {body[:900]}".lower()
    query = "Rwanda tea plantation green hills"
    for pattern, q in COVER_QUERIES:
        if re.search(pattern, blob, re.I):
            query = q
            break
    for path in existing + LOCAL_POOL:
        if is_banned(path) or path in used:
            continue
        name = path.lower()
        if "kagame" in blob and "kagame" in name:
            return path
        if ("virunga" in blob or "park" in blob or "gorilla" in blob) and ("virunga" in name or "gorilla" in name):
            return path
        if ("kivu" in blob or "goma" in blob or "rubavu" in blob) and "kivu" in name:
            return path
    try:
        hits = wikimedia_search(query, limit=8)
    except Exception:
        hits = []
    for hit in hits:
        fname = safe_cover_name(hit["title"] or hashlib.md5(hit["url"].encode()).hexdigest())
        if is_banned(fname):
            continue
        dest = COVERS / fname
        path = f"/covers/{fname}"
        if path in used:
            continue
        if download_cover(hit["url"], dest):
            return path
    for path in LOCAL_POOL:
        if path not in used and not is_banned(path) and (ROOT / "public" / path.lstrip("/")).exists():
            return path
    return "/covers/Kivu_Goma_and_Rubavu_On_Rwanda_Side.jpg"


def is_featured(title: str) -> bool:
    t = title.lower()
    return any(h.lower() in t for h in FEATURED_HINTS)


def main() -> None:
    api_key, base, model = openai_cfg()
    COVERS.mkdir(parents=True, exist_ok=True)
    items = parse_report(REPORT.read_text(encoding="utf-8"))
    print(f"parsed {len(items)} articles", flush=True)
    existing = [f"/covers/{p.name}" for p in COVERS.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]

    translated = [None] * len(items)

    def work(idx, item):
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

    used_images: set[str] = set()
    used_slugs: set[str] = set()
    seed_new = []
    for i, item in enumerate(items):
        fr = translated[i]
        slug = slugify(item["title_en"])
        base_slug, n = slug, 2
        while slug in used_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        used_slugs.add(slug)
        image = pick_cover(item["title_en"], item["body_en"], used_images, existing)
        used_images.add(image)
        if image not in existing:
            existing.append(image)
        feat = is_featured(item["title_en"])
        art = {
            "slug": slug,
            "category": item["category"],
            "featured": feat,
            "rank": 12 if feat else 55,
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
            "country": "RWANDA",
            "source": SOURCE,
            "coverImageAltFr": fr["title"],
            "coverImageAltEn": item["title_en"],
        }
        for k in ("title", "excerpt", "title_en", "excerpt_en", "body_en", "body_fr"):
            art[k] = hyphenate(art[k])
        seed_new.append(art)

    OUT_META.write_text(json.dumps(seed_new, ensure_ascii=False, indent=2), encoding="utf-8")
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    before = len(seed)
    seed = [a for a in seed if a.get("source") != SOURCE]
    for a in seed:
        if a.get("country") == "RWANDA" and a.get("featured") and is_banned(a.get("image") or ""):
            a["featured"] = False
            for alt in LOCAL_POOL:
                if not is_banned(alt):
                    a["image"] = alt
                    break
    seed.extend(seed_new)
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"seed {before} -> {len(seed)} (+{len(seed_new)} rwanda, featured={sum(1 for a in seed_new if a['featured'])}, unique_images={len(used_images)})",
        flush=True,
    )


if __name__ == "__main__":
    main()
