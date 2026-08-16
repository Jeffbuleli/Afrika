#!/usr/bin/env python3
"""Curate Africa Insight homepage: country-balanced featured set + hero lock."""
from __future__ import annotations

import json
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
OUT = ROOT / "content" / "homepage-curation.json"
MCBULELI_ENV = Path("/Users/mac/Documents/McBuleliP2P/.env")

HERO_SLUG = (
    "constitutional-referendum-dispute-widens-as-opposition-plans-national-ma-7144cc"
)
HERO_IMAGE = "/covers/F_lix_Tshisekedi_in_2021.jpg"

# Country importance order for homepage
COUNTRY_ORDER = ["DRC", "RWANDA", "SUDAN", "UGANDA", "MALI", "DJIBOUTI", "BURKINA"]

# Target homepage featured slots (lead + rail + trio + ticker depth)
TARGET_FEATURED = 14


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
    model = (env.get("OPENAI_TRANSLATE_MODEL") or "gpt-4o-mini").strip()
    if not key:
        raise SystemExit("OPENAI_API_KEY missing")
    return key, base, model


def candidates_for(seed: list[dict]) -> list[dict]:
    """Recent high-signal articles per priority country."""
    by_country: dict[str, list[dict]] = {c: [] for c in COUNTRY_ORDER}
    for a in seed:
        c = (a.get("country") or "").upper()
        if c not in by_country:
            continue
        by_country[c].append(a)
    out = []
    for c in COUNTRY_ORDER:
        arts = by_country[c]
        aug = [a for a in arts if str(a.get("publishedAt") or "").startswith("2026-08")]
        pool = aug if aug else arts
        pool = sorted(pool, key=lambda x: x.get("publishedAt") or "", reverse=True)
        # denser for top countries
        take = { "DRC": 18, "RWANDA": 12, "SUDAN": 10, "UGANDA": 10 }.get(c, 6)
        for a in pool[:take]:
            out.append(
                {
                    "slug": a["slug"],
                    "country": c,
                    "category": a.get("category"),
                    "publishedAt": a.get("publishedAt"),
                    "title_en": (a.get("title_en") or a.get("title") or "")[:140],
                    "excerpt_en": (a.get("excerpt_en") or a.get("excerpt") or "")[:220],
                }
            )
    return out


def openai_rank(api_key: str, base: str, model: str, cands: list[dict]) -> list[str]:
    system = (
        "You are the homepage editor for Africa Insight, an African news analysis outlet. "
        "Build an immersive, harmonious homepage ranking. "
        "Rules: "
        "1) First slug MUST be the locked hero provided. "
        "2) Slot 2 should be the strongest recent Rwanda story (diplomacy/economy preferred). "
        "3) Then rotate countries by importance: DRC, Rwanda, Sudan, Uganda, Mali, Djibouti, Burkina. "
        "4) Prefer recent Aug 2026 stories, high editorial quality, investor/political significance. "
        "5) Avoid near-duplicates (same event twice). "
        "6) Aim for category variety (politique/securite/economie/justice/societe). "
        "Return JSON only: {\"ordered_slugs\":[...]} with exactly "
        f"{TARGET_FEATURED} unique slugs from the candidate list."
    )
    user = json.dumps(
        {
            "locked_hero": HERO_SLUG,
            "country_priority": COUNTRY_ORDER,
            "candidates": cands,
        },
        ensure_ascii=False,
    )
    payload = {
        "model": model,
        "temperature": 0.25,
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
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
            parsed = json.loads(data["choices"][0]["message"]["content"])
            slugs = parsed.get("ordered_slugs") or []
            if isinstance(slugs, list) and slugs:
                return [str(s) for s in slugs]
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"openai rank failed: {last}")


def fallback_rank(cands: list[dict]) -> list[str]:
    """Deterministic balanced fallback if API fails."""
    by_c: dict[str, list[dict]] = {c: [] for c in COUNTRY_ORDER}
    for a in cands:
        by_c.setdefault(a["country"], []).append(a)
    for c in by_c:
        by_c[c].sort(key=lambda x: x.get("publishedAt") or "", reverse=True)

    ordered = [HERO_SLUG]
    # Rwanda second
    for a in by_c.get("RWANDA", []):
        if a["slug"] != HERO_SLUG:
            ordered.append(a["slug"])
            break
    # round-robin remaining
    pointers = {c: 0 for c in COUNTRY_ORDER}
    while len(ordered) < TARGET_FEATURED:
        progressed = False
        for c in COUNTRY_ORDER:
            pool = by_c.get(c) or []
            while pointers[c] < len(pool):
                slug = pool[pointers[c]]["slug"]
                pointers[c] += 1
                if slug not in ordered:
                    ordered.append(slug)
                    progressed = True
                    break
            if len(ordered) >= TARGET_FEATURED:
                break
        if not progressed:
            break
    return ordered[:TARGET_FEATURED]


def main() -> None:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    by_slug = {a["slug"]: a for a in seed}
    if HERO_SLUG not in by_slug:
        raise SystemExit(f"hero missing: {HERO_SLUG}")

    cands = candidates_for(seed)
    # ensure hero in candidates
    if not any(c["slug"] == HERO_SLUG for c in cands):
        h = by_slug[HERO_SLUG]
        cands.insert(
            0,
            {
                "slug": HERO_SLUG,
                "country": "DRC",
                "category": h.get("category"),
                "publishedAt": h.get("publishedAt"),
                "title_en": h.get("title_en") or h.get("title"),
                "excerpt_en": h.get("excerpt_en") or h.get("excerpt"),
            },
        )

    try:
        api_key, base, model = openai_cfg()
        ordered = openai_rank(api_key, base, model, cands)
        print(f"openai ranked {len(ordered)}", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"openai fallback: {exc}", flush=True)
        ordered = fallback_rank(cands)

    # sanitize
    seen = set()
    clean = []
    if HERO_SLUG not in ordered:
        ordered = [HERO_SLUG] + ordered
    for s in ordered:
        if s in by_slug and s not in seen:
            clean.append(s)
            seen.add(s)
    # pad with fallback if short
    if len(clean) < TARGET_FEATURED:
        for s in fallback_rank(cands):
            if s not in seen and s in by_slug:
                clean.append(s)
                seen.add(s)
            if len(clean) >= TARGET_FEATURED:
                break
    clean = clean[:TARGET_FEATURED]
    # force hero first
    clean = [HERO_SLUG] + [s for s in clean if s != HERO_SLUG]
    clean = clean[:TARGET_FEATURED]

    # reset all featured
    for a in seed:
        a["featured"] = False
        # keep rank if present but demote
        if "rank" in a:
            a["rank"] = max(int(a.get("rank") or 50), 50)

    # apply homepage set
    for i, slug in enumerate(clean):
        a = by_slug[slug]
        a["featured"] = True
        a["rank"] = 1 + i  # 1 = hero
        a["homeSlot"] = i + 1
        if slug == HERO_SLUG:
            # HD portrait for immersive hero
            if (ROOT / "public" / HERO_IMAGE.lstrip("/")).exists():
                a["image"] = HERO_IMAGE
                a["coverImageAltEn"] = a.get("title_en") or a.get("title") or "Félix Tshisekedi"
                a["coverImageAltFr"] = a.get("title") or a.get("title_en") or "Félix Tshisekedi"

    report = {
        "hero": HERO_SLUG,
        "ordered": [
            {
                "slot": i + 1,
                "slug": s,
                "country": by_slug[s].get("country"),
                "category": by_slug[s].get("category"),
                "title_en": (by_slug[s].get("title_en") or by_slug[s].get("title") or "")[:90],
                "image": by_slug[s].get("image"),
            }
            for i, s in enumerate(clean)
        ],
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"featured={sum(1 for a in seed if a.get('featured'))}", flush=True)


if __name__ == "__main__":
    main()
