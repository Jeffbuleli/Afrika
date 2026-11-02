#!/usr/bin/env python3
"""Ingest GoodHope × Africa Insight DRC pilot (Option A) into seed-all.json."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from hashlib import md5
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
COVERS = ROOT / "public" / "covers"
BODY = ROOT / "content" / "goodhope-drc-pilot-body-en.md"

SLUG = "drc-cobalt-copper-operational-copperbelt-oct-2026"
WIKI_FILE = "Kamoto_Mine_-_panoramio.jpg"

TITLE_EN = (
    "DRC cobalt and copper: what is operational on the copperbelt - "
    "and what remains announced in Kinshasa and Brussels"
)
TITLE_FR = (
    "RDC : cobalt et cuivre - ce qui est opérationnel sur le Copperbelt - "
    "et ce qui reste annoncé à Kinshasa et Bruxelles"
)
EXCERPT_EN = (
    "Kolwezi and Lubumbashi, through 30 October 2026 - Africa Insight desk reporting "
    "on running but fragile artisanal formalisation, uneven grid relief, and the gap "
    "between traceability enforcement and legal outlets for creuseurs, with a separate "
    "GoodHope guest policy lens."
)
EXCERPT_FR = (
    "Kolwezi et Lubumbashi, jusqu'au 30 octobre 2026 - enquête Africa Insight sur une "
    "formalisation artisanale fragile, un réseau électrique inégal et l'écart entre "
    "contrôles de traçabilité et débouchés légaux, avec un cadre invité GoodHope."
)


def wiki_commons_url(filename: str) -> str:
    name = filename.replace(" ", "_")
    h = md5(name.encode("utf-8")).hexdigest()
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/"
        f"{h[0]}/{h[0:2]}/{urllib.parse.quote(name)}"
    )


def download_cover() -> str:
    COVERS.mkdir(parents=True, exist_ok=True)
    dest_name = "Kamoto_Mine_panoramio_goodhope_pilot.jpg"
    dest = COVERS / dest_name
    if not dest.exists():
        url = wiki_commons_url(WIKI_FILE)
        req = urllib.request.Request(url, headers={"User-Agent": "AfricaInsight/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
    return f"/covers/{dest_name}"


def french_body_synopsis() -> str:
    return (
        "Kolwezi et Lubumbashi, le 2 novembre 2026 - Sur le Copperbelt congolais, "
        "gouvernements et investisseurs mettent en avant la transformation locale, "
        "le cobalt artisanal traçable et la nouvelle énergie d'Inga. La question "
        "pratique est plus étroite : quels actifs produisent du métal et des "
        "électrons ce trimestre, et quels projets restent autorisés sur le papier, "
        "en chantier derrière une clôture ou annoncés dans les capitales.\n\n"
        "Cette enquête pilote Africa Insight (corps en anglais, alignée sur la "
        "revue mutuelle du 30 octobre 2026) couvre la formalisation artisanale, "
        "les tensions d'octobre (Musompo, SAEMAPE, KCC/DGI), l'électricité et "
        "les contrats d'État. Le cadre invité GoodHope Africa-China Lens "
        "figure en fin d'article en version anglaise.\n\n"
        "Pour le texte intégral et le cadre invité, basculer sur la version "
        "anglaise (EN) via le drapeau en tête d'article."
    )


def main() -> None:
    if not BODY.exists():
        raise SystemExit(f"Missing body: {BODY}")
    body_en = BODY.read_text(encoding="utf-8").strip()
    cover = download_cover()
    words = len(body_en.split())
    reading = max(5, round(words / 200))

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    existing = next((a for a in seed if a.get("slug") == SLUG), None)
    published_at = (
        existing.get("publishedAt")
        if existing
        else datetime.now(timezone.utc).strftime("%Y-%m-%dT12:00:00.000Z")
    )

    entry = {
        "slug": SLUG,
        "category": "economie",
        "featured": True,
        "rank": 5,
        "publishedAt": published_at,
        "image": cover,
        "title": TITLE_FR,
        "excerpt": EXCERPT_FR,
        "title_en": TITLE_EN,
        "excerpt_en": EXCERPT_EN,
        "body_en": body_en,
        "body_fr": french_body_synopsis(),
        "readingTimeMinutes": reading,
        "author": "jeff-buleli",
        "coverImageAltFr": "Mine Kamoto, Kolwezi - CC BY-SA 3.0, Martin Tuchscherer (Wikimedia Commons)",
        "coverImageAltEn": "Kamoto Mine, Kolwezi - CC BY-SA 3.0, Martin Tuchscherer (Wikimedia Commons)",
        "country": "DRC",
        "source": "goodhope-drc-pilot-mou-2026",
    }

    seed = [a for a in seed if a.get("slug") != SLUG]
    seed.insert(0, entry)
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK seed entry slug={SLUG} reading={reading}min cover={cover}")


if __name__ == "__main__":
    main()
