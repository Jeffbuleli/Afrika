#!/usr/bin/env python3
"""Curate homepage around Aug 16-31 SHINTA batch: DRC/Rwanda/Sudan/Uganda + HD covers."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
OUT = ROOT / "content" / "homepage-curation.json"
COVERS = ROOT / "public" / "covers"

# Slot order: country rotation by importance, high editorial quality, unique HD images.
SLOTS = [
    # 1 hero DRC
    (
        "tshisekedi-opens-national-dialogue-but-excludes-afc-m23-rebels",
        "/covers/F_lix_Tshisekedi_in_2021.jpg",
    ),
    # 2 Rwanda
    (
        "kagame-says-fdlr-threat-keeps-rwanda-engaged-in-eastern-congo-crisis",
        "/covers/1280px-Paul_Kagame__2018-06-13_.jpg",
    ),
    # 3 Sudan
    (
        "sudan-forms-crisis-cell-as-pound-hits-record-low",
        "/covers/1280px-Al_Taif__Khartoum__Sudan_-_panoramio.jpg",
    ),
    # 4 Uganda
    (
        "museveni-opens-125-million-roofings-steel-plant-in-namanve",
        "/covers/Yoweri_Museveni_September_2015.jpg",
    ),
    # 5 DRC
    (
        "ebola-crisis-deepens-as-un-and-who-seek-access-to-conflict-zones",
        "/covers/Ebola_virus_virion.jpg",
    ),
    # 6 Rwanda
    (
        "rwanda-raises-policy-rate-to-8-75-percent-as-inflation-stays-elevated",
        "/covers/1280px-Kigali_skyline.jpg",
    ),
    # 7 Sudan
    (
        "us-pushes-un-to-expand-sudan-arms-embargo-to-drones",
        "/covers/1280px-Headquarters_of_the_United_Nations__New_York_City__20231001_1103_1006.jpg",
    ),
    # 8 Uganda
    (
        "eacop-nears-completion-as-oil-developers-emphasize-environmental-restora-325f81",
        "/covers/1280px-Lake_Victoria-_Kampala-Uganda_1.jpg",
    ),
    # 9 DRC
    (
        "ceasefire-verification-mission-deploys-to-minembwe",
        "/covers/An_Indian_peacekeeper_at_his_lookout_post_in_Walikale__North_Kivu_province__DR_Congo__1362.jpg",
    ),
    # 10 Rwanda
    (
        "rwandair-adds-airbus-a330-200-to-support-long-haul-expansion",
        "/covers/An_aerial_view_of_new_look_of_Rwanda_Parliament_Building_in_Kimihurura__Kigali_on_May_16__.jpg",
    ),
    # 11 Sudan
    (
        "rsf-claims-capture-of-key-army-bases-in-blue-nile",
        "/covers/1280px-Sudan._Khartoum._Bridge_across_Blue_Nile_from_Khartou_551d47473a.jpg",
    ),
    # 12 Uganda
    (
        "bobi-wine-backs-olara-otunnu-for-un-secretary-general-bid",
        "/covers/KampalaSkyline.jpg",
    ),
    # 13 DRC
    (
        "tanzania-backs-drc-sovereignty-as-tshisekedi-and-samia-deepen-security-c-90021a",
        "/covers/1280px-Virunga_Mountains.jpg",
    ),
    # 14 Sudan
    (
        "african-union-backs-sudan-dialogue-plan-as-civilian-blocs-object",
        "/covers/1280px-Chairman_of_the_Sovereignty_Council_of_Sudan_Abdel_Fa_55de66e285.jpg",
    ),
]

HERO_SLUG = SLOTS[0][0]


def main() -> None:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    by_slug = {a["slug"]: a for a in seed}

    missing = [s for s, _ in SLOTS if s not in by_slug]
    if missing:
        raise SystemExit(f"missing slugs: {missing}")

    for slug, image in SLOTS:
        path = COVERS / image.lstrip("/covers/")
        if not path.exists():
            raise SystemExit(f"missing cover file: {image}")
        if path.stat().st_size < 40_000:
            raise SystemExit(f"cover too small (not HD): {image} ({path.stat().st_size})")

    # reset featured
    for a in seed:
        a["featured"] = False
        a["rank"] = max(int(a.get("rank") or 50), 50)
        a.pop("homeSlot", None)

    report_ordered = []
    used_images: set[str] = set()
    for i, (slug, image) in enumerate(SLOTS):
        if image in used_images:
            raise SystemExit(f"duplicate image: {image}")
        used_images.add(image)
        a = by_slug[slug]
        a["featured"] = True
        a["rank"] = i + 1
        a["homeSlot"] = i + 1
        a["image"] = image
        a["coverImageAltEn"] = a.get("title_en") or a.get("title") or ""
        a["coverImageAltFr"] = a.get("title") or a.get("title_en") or ""
        report_ordered.append(
            {
                "slot": i + 1,
                "slug": slug,
                "country": a.get("country"),
                "category": a.get("category"),
                "title_en": (a.get("title_en") or a.get("title") or "")[:90],
                "image": image,
            }
        )

    report = {"hero": HERO_SLUG, "ordered": report_ordered, "note": "Aug 16-31 country-balanced HD curation"}
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # country balance check
    from collections import Counter

    c = Counter(x["country"] for x in report_ordered)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("countries", dict(c))
    print(f"featured={sum(1 for a in seed if a.get('featured'))} unique_images={len(used_images)}")


if __name__ == "__main__":
    main()
