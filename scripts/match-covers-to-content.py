#!/usr/bin/env python3
"""Reassign article cover images to match people, places, themes, and country."""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"
COVERS = ROOT / "public" / "covers"

# Local cover catalog: path relative to site root -> metadata
# Prefer concrete news photography over maps/architectural drawings.
CATALOG: list[dict] = [
    # DRC - people
    {
        "path": "/covers/F_lix_Tshisekedi_in_2021.jpg",
        "country": "DRC",
        "tags": {"tshisekedi", "president", "politique", "kinshasa"},
    },
    {
        "path": "/covers/F_lix_Tshisekedi_et_Stanis_Bujakera.jpg",
        "country": "DRC",
        "tags": {"tshisekedi", "president", "politique", "media"},
    },
    {
        "path": "/covers/1280px-F_lix_Tshisekedi___Denis_Sassou-Nguesso.jpg",
        "country": "DRC",
        "tags": {"tshisekedi", "president", "diplomacy", "afrique"},
    },
    # DRC - places / east / resources
    {
        "path": "/covers/1280px-La_Gombe__Kinshasa__RDC.jpg",
        "country": "DRC",
        "tags": {"kinshasa", "capitale", "economie", "politique", "gouvernement"},
    },
    {
        "path": "/covers/1280px-2010-03-07-Kinshasa_depuis_Brazzaville.jpg",
        "country": "DRC",
        "tags": {"kinshasa", "capitale", "economie"},
    },
    {
        "path": "/covers/1280px-Chuduku_in_Goma.jpg",
        "country": "DRC",
        "tags": {"goma", "est", "m23", "securite", "nord-kivu", "fardc"},
    },
    {
        "path": "/covers/Goma__Lake_Kivu__DRC__Zaire_-_Congo__Photo_by_Sascha_Grabow.jpg",
        "country": "DRC",
        "tags": {"goma", "kivu", "est", "m23", "securite", "nord-kivu"},
    },
    {
        "path": "/covers/Lake_Kivu.jpg",
        "country": "DRC",
        "tags": {"kivu", "est", "goma", "securite", "lac"},
    },
    {
        "path": "/covers/1280px-Lava_Lake_Nyiragongo_2.jpg",
        "country": "DRC",
        "tags": {"goma", "nyiragongo", "est", "nord-kivu", "nature"},
    },
    {
        "path": "/covers/1280px-Virunga_Mountains.jpg",
        "country": "DRC",
        "tags": {"virunga", "est", "nord-kivu", "securite", "nature", "parc"},
    },
    {
        "path": "/covers/1280px-Gold-crystals.jpg",
        "country": "DRC",
        "tags": {"mining", "mine", "or", "gold", "coltan", "ressources", "economie"},
    },
    # Rwanda
    {
        "path": "/covers/1280px-Paul_Kagame_MSC_2017.jpg",
        "country": "RWANDA",
        "tags": {"kagame", "president", "politique", "diplomacy", "afrique"},
    },
    {
        "path": "/covers/1280px-Paul_Kagame_2014.jpg",
        "country": "RWANDA",
        "tags": {"kagame", "president", "politique"},
    },
    {
        "path": "/covers/1280px-Paul_Kagame__2018-06-13_.jpg",
        "country": "RWANDA",
        "tags": {"kagame", "president", "politique", "diplomacy"},
    },
    {
        "path": "/covers/1280px-Kigali_skyline.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "capitale", "economie", "politique"},
    },
    {
        "path": "/covers/1280px-Kigali.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "capitale", "societe"},
    },
    {
        "path": "/covers/Kigali-Skyline-NP-480.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "capitale", "economie"},
    },
    {
        "path": "/covers/1280px-View_on_Kigali__02_.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "capitale", "economie"},
    },
    {
        "path": "/covers/1280px-Kigali_Convention_Centre.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "economie", "investissement", "business", "conference"},
    },
    {
        "path": "/covers/1280px-An_aerial_of_Kigali_Convention_Center_on_June_19__201_8a0e5f11cc.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "economie", "investissement", "business", "conference"},
    },
    {
        "path": "/covers/1280px-Kigali_convention_centre_338aa44a.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "economie", "investissement", "business"},
    },
    {
        "path": "/covers/1280px-Kigali_Convention_Center_outside_parking_and_compound.jpg",
        "country": "RWANDA",
        "tags": {"kigali", "economie", "business"},
    },
    # Uganda
    {
        "path": "/covers/Yoweri_Museveni_September_2015.jpg",
        "country": "UGANDA",
        "tags": {"museveni", "president", "politique"},
    },
    {
        "path": "/covers/KampalaSkyline.jpg",
        "country": "UGANDA",
        "tags": {"kampala", "capitale", "economie", "politique"},
    },
    {
        "path": "/covers/KampalaSkyline2.jpg",
        "country": "UGANDA",
        "tags": {"kampala", "capitale", "economie"},
    },
    {
        "path": "/covers/1280px-Kampala_skyline.jpg",
        "country": "UGANDA",
        "tags": {"kampala", "capitale", "economie", "energie"},
    },
    {
        "path": "/covers/1280px-Skyline_of_Kampala.jpg",
        "country": "UGANDA",
        "tags": {"kampala", "capitale", "politique"},
    },
    {
        "path": "/covers/1280px-Kampala-Gaddafi_Mosque.jpg",
        "country": "UGANDA",
        "tags": {"kampala", "culture", "societe", "religion"},
    },
    {
        "path": "/covers/1280px-View_of_Victoria_Lake_in_Uganda.jpg",
        "country": "UGANDA",
        "tags": {"victoria", "lac", "nature", "securite"},
    },
    {
        "path": "/covers/View_at_Lake_Victoria__Uganda_.jpg",
        "country": "UGANDA",
        "tags": {"victoria", "lac", "nature"},
    },
    {
        "path": "/covers/1280px-Lake_Victoria-_Kampala-Uganda.jpg",
        "country": "UGANDA",
        "tags": {"victoria", "kampala", "lac"},
    },
    {
        "path": "/covers/River_nile_in_Jinja.jpg",
        "country": "UGANDA",
        "tags": {"nil", "jinja", "energie", "infrastructure", "economie"},
    },
    {
        "path": "/covers/1280px-Nile_Bridge_in_Jinja_City_Along_Kampala-Jinja_Highway.jpg",
        "country": "UGANDA",
        "tags": {"nil", "jinja", "infrastructure", "economie"},
    },
    {
        "path": "/covers/1280px-Source_of_the_Nile__Jinja_Uganda.jpg",
        "country": "UGANDA",
        "tags": {"nil", "jinja", "nature"},
    },
    # Mali
    {
        "path": "/covers/1280px-Bamako_ACI_2000_Aeriel.jpg",
        "country": "MALI",
        "tags": {"bamako", "capitale", "politique", "economie", "justice", "gouvernement"},
    },
    {
        "path": "/covers/Great_Mosque_of_Djenn__1.jpg",
        "country": "MALI",
        "tags": {"culture", "societe", "djenne", "heritage", "religion"},
    },
    {
        "path": "/covers/Great_Mosque_of_Djenn__3.jpg",
        "country": "MALI",
        "tags": {"culture", "societe", "djenne", "heritage"},
    },
    {
        "path": "/covers/Djenn__Moschee.jpg",
        "country": "MALI",
        "tags": {"culture", "djenne", "heritage"},
    },
    {
        "path": "/covers/1280px-Djenn__Moschee_Dach_1990.jpg",
        "country": "MALI",
        "tags": {"culture", "djenne"},
    },
    {
        "path": "/covers/1280px-MaliDjenn_Mosqu_e.JPG",
        "country": "MALI",
        "tags": {"culture", "djenne"},
    },
    {
        "path": "/covers/Djinguereber_Mosque__Timbuktu__Mali.jpg",
        "country": "MALI",
        "tags": {"timbuktu", "tombouctou", "culture", "securite", "nord", "jihad"},
    },
    {
        "path": "/covers/Timbuktu_Mosque_Sankore.jpg",
        "country": "MALI",
        "tags": {"timbuktu", "tombouctou", "culture", "nord", "securite"},
    },
    # Sudan
    {
        "path": "/covers/1280px-Chairman_of_the_Sovereignty_Council_of_Sudan_Abdel_Fa_55de66e285.jpg",
        "country": "SUDAN",
        "tags": {"burhan", "armee", "politique", "securite", "president"},
    },
    {
        "path": "/covers/1280px-Ilham_Aliyev_met_with_Chairman_of_Sovereign_Council_o_aecfde07e9.jpg",
        "country": "SUDAN",
        "tags": {"burhan", "diplomacy", "politique", "afrique"},
    },
    {
        "path": "/covers/Khartoum.jpg",
        "country": "SUDAN",
        "tags": {"khartoum", "capitale", "guerre", "securite", "rsf"},
    },
    {
        "path": "/covers/1280px-Al_Taif__Khartoum__Sudan_-_panoramio.jpg",
        "country": "SUDAN",
        "tags": {"khartoum", "capitale", "securite", "guerre"},
    },
    {
        "path": "/covers/The_Nile_Khartoum_Bahri.jpg",
        "country": "SUDAN",
        "tags": {"khartoum", "nil", "guerre", "securite"},
    },
    {
        "path": "/covers/1280px-The_Blue_Nile_in_Khartoum.jpg",
        "country": "SUDAN",
        "tags": {"nil", "blue-nile", "khartoum", "securite", "guerre", "armee"},
    },
    {
        "path": "/covers/1280px-A_boat_on_the_Blue_Nile.jpg",
        "country": "SUDAN",
        "tags": {"nil", "blue-nile", "securite", "armee"},
    },
    {
        "path": "/covers/1280px-Sudan._Khartoum._Bridge_across_Blue_Nile_from_Khartou_551d47473a.jpg",
        "country": "SUDAN",
        "tags": {"khartoum", "nil", "blue-nile", "infrastructure"},
    },
    # Djibouti
    {
        "path": "/covers/Djibouti_City.jpg",
        "country": "DJIBOUTI",
        "tags": {"djibouti", "capitale", "politique", "economie"},
    },
    {
        "path": "/covers/Obock__Djibouti.jpg",
        "country": "DJIBOUTI",
        "tags": {"djibouti", "societe", "ville"},
    },
    {
        "path": "/covers/Djibouti_Port.JPG",
        "country": "DJIBOUTI",
        "tags": {"port", "commerce", "economie", "maritime", "trade"},
    },
    {
        "path": "/covers/1280px-180504-N-FD185-7900_PORT_OF_DJIBOUTI__Djibouti__42035449301_.jpg",
        "country": "DJIBOUTI",
        "tags": {"port", "commerce", "economie", "maritime", "securite"},
    },
    {
        "path": "/covers/INS_Trikand_entering_the_port_of_Djibouti__01_.jpg",
        "country": "DJIBOUTI",
        "tags": {"port", "marine", "securite", "diplomacy"},
    },
    {
        "path": "/covers/INS_Trikand_entering_the_port_of_Djibouti__02_.jpg",
        "country": "DJIBOUTI",
        "tags": {"port", "marine", "securite"},
    },
    {
        "path": "/covers/1280px-K-9_Duty_at_Port_of_Djibouti_DVIDS167979.jpg",
        "country": "DJIBOUTI",
        "tags": {"port", "securite", "armee"},
    },
    {
        "path": "/covers/1280px-Assal_Lake__2024.jpg",
        "country": "DJIBOUTI",
        "tags": {"assal", "nature", "lac", "culture"},
    },
    {
        "path": "/covers/1280px-Lake_Assal_1-Djibouti.jpg",
        "country": "DJIBOUTI",
        "tags": {"assal", "nature", "lac"},
    },
    {
        "path": "/covers/1280px-Lake_Assal_3-Djibouti.jpg",
        "country": "DJIBOUTI",
        "tags": {"assal", "nature", "lac"},
    },
    # Cross-cutting
    {
        "path": "/covers/1280px-Headquarters_of_the_United_Nations__New_York_City__20231001_1103_1006.jpg",
        "country": None,
        "tags": {"un", "onu", "diplomacy", "afrique", "international", "peace"},
    },
]


def load_catalog() -> list[dict]:
    """Merge static catalog with downloaded DRC extras."""
    by_path: dict[str, dict] = {}
    for item in CATALOG:
        entry = {
            "path": item["path"],
            "country": item["country"],
            "tags": set(item["tags"]),
        }
        by_path[entry["path"]] = entry

    extra_path = ROOT / "content" / "drc-extra-covers.json"
    if extra_path.exists():
        for item in json.loads(extra_path.read_text()):
            path = item.get("path")
            if not path:
                continue
            if not (ROOT / "public" / path.lstrip("/")).exists():
                continue
            tags = set(item.get("tags") or [])
            if path in by_path:
                by_path[path]["tags"] |= tags
            else:
                by_path[path] = {
                    "path": path,
                    "country": item.get("country") or "DRC",
                    "tags": tags,
                }
    return list(by_path.values())


# Patterns that extract article themes from text (ordered; weight applied when matched)
THEME_RULES: list[tuple[str, list[str], int]] = [
    ("tshisekedi", [r"\btshisekedi\b"], 14),
    ("kabila", [r"\bkabila\b"], 12),
    ("mukwege", [r"\bmukwege\b"], 12),
    ("kagame", [r"\bkagame\b"], 12),
    ("museveni", [r"\bmuseveni\b"], 12),
    ("burhan", [r"\bburhan\b", r"\bal-burhan\b"], 12),
    ("mining", [r"\bmin(e|ing|es|iers?)\b", r"\bminerals?\b", r"\bminérales?\b", r"\bcoltan\b", r"\bgold\b", r"\bcobalt\b", r"\brubaya\b", r"\bkolwezi\b", r"\bsites? mini"], 10),
    ("m23", [r"\bm23\b", r"\bwazalendo\b", r"\bafc/?m23\b", r"\bafc\b"], 10),
    ("adf", [r"\badf\b"], 10),
    ("beni", [r"\bbeni\b", r"\bbutembo\b"], 10),
    ("goma", [r"\bgoma\b", r"\bsak[eé]\b"], 11),
    ("bukavu", [r"\bbukavu\b"], 11),
    ("uvira", [r"\buvira\b"], 10),
    ("masisi", [r"\bmasisi\b", r"\brutshuru\b", r"\bwalikale\b"], 10),
    ("ituri", [r"\bituri\b", r"\bbunia\b"], 10),
    ("lubumbashi", [r"\blubumbashi\b", r"\bkatanga\b", r"\bhaut[- ]?katanga\b"], 10),
    ("kisangani", [r"\bkisangani\b", r"\btshopo\b"], 10),
    ("matadi", [r"\bmatadi\b", r"\bkongo[- ]?central\b"], 9),
    ("kolwezi", [r"\bkolwezi\b", r"\blualaba\b"], 9),
    ("kivu", [r"\bkivu\b", r"\beastern (drc|congo)\b", r"\best (de la )?(rdc|congo)\b", r"\bnord[- ]?kivu\b", r"\bnorth kivu\b", r"\bsud[- ]?kivu\b", r"\bsouth kivu\b"], 6),
    ("kinshasa", [r"\bkinshasa\b", r"\bgombe\b"], 9),
    ("fardc", [r"\bfardc\b"], 9),
    ("monusco", [r"\bmonusco\b"], 9),
    ("kigali", [r"\bkigali\b"], 9),
    ("kampala", [r"\bkampala\b", r"\blukwago\b"], 9),
    ("bamako", [r"\bbamako\b"], 9),
    ("khartoum", [r"\bkhartoum\b", r"\bport sudan\b", r"\bomdurman\b"], 9),
    ("blue-nile", [r"\bblue nile\b", r"\bnil bleu\b", r"\bkurmuk\b"], 9),
    ("timbuktu", [r"\btimbuktu\b", r"\btombouctou\b", r"\bgao\b", r"\bkidal\b"], 9),
    ("djenne", [r"\bdjenn[eé]\b"], 8),
    ("jinja", [r"\bjinja\b", r"\bsource of the nile\b"], 7),
    ("victoria", [r"\blake victoria\b", r"\blac victoria\b"], 6),
    ("port", [r"\bport of djibouti\b", r"\bmaritime\b", r"\bshipping\b", r"\bshipyard\b", r"\bcoast guard\b"], 8),
    ("jnih", [r"\bjnim\b", r"\bjnih\b", r"\bjama'?at nusrat\b"], 8),
    ("rsf", [r"\brsf\b", r"\bhemetti\b", r"\bdagalo\b", r"\bdarfur\b", r"\bdarfou\b"], 9),
    ("armee", [r"\barmy\b", r"\barm[eé]e\b", r"\bmilitary\b", r"\bclashes?\b", r"\battacks?\b", r"\barmed group"], 5),
    ("diplomacy", [r"\bdiplomat", r"\bambassador", r"\bsummit\b", r"\btalks?\b", r"\bcooperation\b"], 5),
    ("un", [r"\bunited nations\b", r"\bonu\b", r"\bun (report|experts?|warns?|says)\b"], 7),
    ("investissement", [r"\binvest", r"\bprivate sector\b", r"\bjobs?\b", r"\bemploi"], 6),
    ("energie", [r"\benergy\b", r"\bénergie\b", r"\boil\b", r"\bpetroleum\b", r"\belectric"], 6),
    ("justice", [r"\bcourt\b", r"\btribunal\b", r"\bjustice\b", r"\btrial\b", r"\bsentenc"], 5),
    ("culture", [r"\bculture\b", r"\bheritage\b", r"\bmosque\b", r"\bfestival\b"], 5),
    ("assal", [r"\bassal\b"], 8),
    ("gouvernement", [r"\bgovernment\b", r"\bgouvernement\b", r"\bcabinet\b", r"\bparlement\b", r"\bassembly\b"], 4),
    ("president", [r"\bpresident\b", r"\bprésident\b"], 3),
]

# Map inferred places to preferred country override when metadata is wrong
PLACE_COUNTRY = {
    "kampala": "UGANDA",
    "museveni": "UGANDA",
    "jinja": "UGANDA",
    "victoria": "UGANDA",
    "lukwago": "UGANDA",
    "kigali": "RWANDA",
    "kagame": "RWANDA",
    "kinshasa": "DRC",
    "tshisekedi": "DRC",
    "goma": "DRC",
    "kivu": "DRC",
    "uvira": "DRC",
    "m23": "DRC",
    "adf": "DRC",
    "bamako": "MALI",
    "timbuktu": "MALI",
    "djenne": "MALI",
    "jnih": "MALI",
    "khartoum": "SUDAN",
    "burhan": "SUDAN",
    "rsf": "SUDAN",
    "port": "DJIBOUTI",  # weak; only if country already DJIBOUTI handled elsewhere
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.casefold())


def extract_themes(article: dict) -> dict[str, int]:
    blob = normalize(
        " ".join(
            [
                article.get("title_en") or "",
                article.get("title") or "",
                article.get("excerpt_en") or "",
                article.get("excerpt") or "",
                article.get("slug") or "",
                article.get("category") or "",
            ]
        )
    )
    scores: dict[str, int] = defaultdict(int)
    for tag, patterns, weight in THEME_RULES:
        for pat in patterns:
            if re.search(pat, blob, re.I):
                scores[tag] += weight
                break
    cat = article.get("category") or ""
    if cat:
        scores[cat] += 4
    return dict(scores)


def inferred_country(article: dict, themes: dict[str, int]) -> str:
    base = (article.get("country") or "").upper() or "DRC"
    # Strong person/place signals can correct mis-tagged country
    strong = [
        ("tshisekedi", "DRC"),
        ("kagame", "RWANDA"),
        ("museveni", "UGANDA"),
        ("burhan", "SUDAN"),
        ("kampala", "UGANDA"),
        ("kigali", "RWANDA"),
        ("kinshasa", "DRC"),
        ("goma", "DRC"),
        ("bamako", "MALI"),
        ("khartoum", "SUDAN"),
        ("timbuktu", "MALI"),
        ("m23", "DRC"),
        ("adf", "DRC"),
        ("rsf", "SUDAN"),
        ("jnih", "MALI"),
    ]
    best = None
    best_s = 0
    for tag, country in strong:
        s = themes.get(tag, 0)
        if s > best_s:
            best_s = s
            best = country
    if best and best_s >= 9 and best != base:
        # Only override when signal is clear and base country text doesn't dominate
        country_mentions = {
            "DRC": themes.get("kinshasa", 0) + themes.get("goma", 0) + themes.get("kivu", 0) + themes.get("tshisekedi", 0) + themes.get("m23", 0),
            "RWANDA": themes.get("kigali", 0) + themes.get("kagame", 0),
            "UGANDA": themes.get("kampala", 0) + themes.get("museveni", 0) + themes.get("jinja", 0),
            "MALI": themes.get("bamako", 0) + themes.get("timbuktu", 0) + themes.get("jnih", 0),
            "SUDAN": themes.get("khartoum", 0) + themes.get("burhan", 0) + themes.get("rsf", 0),
            "DJIBOUTI": themes.get("port", 0) + themes.get("assal", 0),
        }
        if country_mentions.get(best, 0) >= country_mentions.get(base, 0):
            return best
    return base


def score_cover(cover: dict, themes: dict[str, int], country: str, category: str) -> int:
    score = 0
    if cover["country"] == country:
        score += 8
    elif cover["country"] is None:
        score += 1
    else:
        score -= 12  # hard prefer same country
    tags = cover["tags"]
    # Theme aliases help city/context images match neighboring places
    aliases = {
        "uvira": {"uvira", "bukavu", "sud-kivu"},
        "bukavu": {"bukavu", "uvira", "sud-kivu"},
        "masisi": {"masisi", "rutshuru", "m23", "goma", "nord-kivu"},
        "beni": {"beni", "adf", "nord-kivu", "butembo"},
        "ituri": {"ituri", "bunia"},
        "kolwezi": {"kolwezi", "mining", "katanga", "lubumbashi"},
        "lubumbashi": {"lubumbashi", "katanga", "kolwezi"},
        "fardc": {"fardc", "armee", "securite"},
        "monusco": {"monusco", "un", "securite"},
        "adf": {"adf", "beni"},
        "m23": {"m23", "goma", "rutshuru", "masisi", "est"},
        "mining": {"mining", "kolwezi", "ressources", "gold", "coltan"},
        "gouvernement": {"gouvernement", "kinshasa", "politique"},
    }
    for tag, w in themes.items():
        if tag in tags:
            score += w
            continue
        for alt in aliases.get(tag, ()):
            if alt in tags:
                score += max(1, w - 2)
                break
    # Category soft boost
    if category and category in tags:
        score += 3
    # Prefer not to use UN HQ unless UN/diplomacy is strong
    if cover["path"].endswith("1006.jpg") and themes.get("un", 0) < 7 and themes.get("diplomacy", 0) < 5:
        score -= 20
    # Prefer mining image only for mining
    if "Gold-crystals" in cover["path"] and themes.get("mining", 0) < 8:
        score -= 15
    # Avoid architectural drawings when better city photos exist
    if "Sudan_Development_Corporation" in cover["path"]:
        score -= 6
    if "Ange_Kagame" in cover["path"]:
        score -= 25
    # If article is about Tshisekedi, strongly prefer his portraits
    if themes.get("tshisekedi", 0) >= 12:
        if "tshisekedi" in tags:
            score += 14
        elif "kinshasa" in tags and "politique" in tags:
            score += 2
        else:
            score -= 8
    return score


def pick_cover(
    article: dict,
    themes: dict[str, int],
    country: str,
    usage: dict[str, int],
    recent: list[str],
    catalog: list[dict],
) -> str:
    category = article.get("category") or ""
    ranked = []
    for cover in catalog:
        path = cover["path"]
        if not (ROOT / "public" / path.lstrip("/")).exists():
            continue
        s = score_cover(cover, themes, country, category)
        # diversify: stronger penalty for heavy reuse
        s -= usage.get(path, 0) * 2
        if path in recent[-12:]:
            s -= 6
        ranked.append((s, path))
    ranked.sort(key=lambda x: (-x[0], x[1]))
    if not ranked:
        return article.get("image") or "/covers/Lake_Kivu.jpg"
    top = ranked[0][0]
    # wider candidate window for Tshisekedi/DRC variety
    window = 5 if country == "DRC" else 2
    if themes.get("tshisekedi", 0) >= 12:
        # rotate among Tshisekedi portraits first
        portraits = [p for s, p in ranked if "Tshisekedi" in p or "tshisekedi" in p.lower() or "F_lix" in p]
        if portraits:
            h = int(hashlib.md5((article.get("slug") or "").encode()).hexdigest(), 16)
            return portraits[h % min(len(portraits), 8)]
    candidates = [p for s, p in ranked if s >= top - window][:12]
    h = int(hashlib.md5((article.get("slug") or "").encode()).hexdigest(), 16)
    return candidates[h % len(candidates)]


def alt_for(path: str, locale: str, title: str) -> str:
    name = Path(path).stem.replace("_", " ").replace("1280px-", "")
    name = re.sub(r"\s+", " ", name).strip()
    if locale == "fr":
        return f"Illustration - {name}" if name else title
    return f"Cover - {name}" if name else title


def main() -> None:
    arts = json.loads(SEED.read_text())
    catalog = load_catalog()
    print(f"catalog size {len(catalog)}")
    usage: dict[str, int] = defaultdict(int)
    recent: list[str] = []
    changed = 0
    samples = []

    # Process newest first so homepage-facing stories get better picks, then older
    indexed = list(enumerate(arts))
    indexed.sort(key=lambda it: it[1].get("publishedAt") or "", reverse=True)

    new_images = [None] * len(arts)
    for idx, article in indexed:
        themes = extract_themes(article)
        country = inferred_country(article, themes)
        path = pick_cover(article, themes, country, usage, recent, catalog)
        new_images[idx] = (path, themes, country)
        usage[path] += 1
        recent.append(path)

    for i, article in enumerate(arts):
        path, themes, country = new_images[i]
        old = article.get("image")
        if old != path:
            changed += 1
        article["image"] = path
        title_fr = article.get("title") or ""
        title_en = article.get("title_en") or title_fr
        article["coverImageAltFr"] = alt_for(path, "fr", title_fr)
        article["coverImageAltEn"] = alt_for(path, "en", title_en)
        if len(samples) < 12:
            top_themes = sorted(themes.items(), key=lambda x: -x[1])[:4]
            samples.append(
                {
                    "slug": article.get("slug"),
                    "country": country,
                    "category": article.get("category"),
                    "title": (article.get("title_en") or article.get("title") or "")[:80],
                    "themes": top_themes,
                    "image": path,
                }
            )

    SEED.write_text(json.dumps(arts, ensure_ascii=False, indent=2) + "\n")
    report = {
        "articles": len(arts),
        "changed": changed,
        "catalog": len(catalog),
        "usage_top": sorted(usage.items(), key=lambda x: -x[1])[:25],
        "samples": samples,
    }
    (ROOT / "content" / "cover-match-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"updated {changed}/{len(arts)} covers")
    for s in samples:
        print(
            f"- [{s['country']}/{s['category']}] {s['title']}\n"
            f"  themes={s['themes']}\n  -> {s['image']}"
        )


if __name__ == "__main__":
    main()
