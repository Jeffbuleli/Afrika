#!/usr/bin/env python3
"""Normalize article leads to: City, date - details (ASCII hyphen)."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"

CITY_BY_COUNTRY = {
    "DRC": "Kinshasa",
    "RWANDA": "Kigali",
    "MALI": "Bamako",
    "NIGER": "Niamey",
    "SUDAN": "Khartoum",
    "BURKINA": "Ouagadougou",
    "DJIBOUTI": "Djibouti",
    "UGANDA": "Kampala",
    "AFRICA": "Africa",
}

KNOWN_CITIES = [
    "Washington, D.C.",
    "Washington D.C.",
    "Washington DC",
    "Washington",
    "New York",
    "Djibouti City",
    "Addis Ababa",
    "Nairobi",
    "Geneva",
    "Paris",
    "Brussels",
    "London",
    "Pretoria",
    "Johannesburg",
    "Cape Town",
    "Lagos",
    "Abuja",
    "Dakar",
    "Luanda",
    "Bujumbura",
    "Goma",
    "Bukavu",
    "Beni",
    "Bunia",
    "Kisangani",
    "Lubumbashi",
    "Kolwezi",
    "Kalemie",
    "Uvira",
    "Rutshuru",
    "Masisi",
    "Walikale",
    "Butembo",
    "Kindu",
    "Matadi",
    "Mbandaka",
    "Kananga",
    "Mbuji-Mayi",
    "Port-Soudan",
    "Port Sudan",
    "El Obeid",
    "Nyala",
    "El Fasher",
    "Kassala",
    "Juba",
    "Entebbe",
    "Jinja",
    "Gulu",
    "Lira",
    "Nansana",
    "Adjumani",
    "Timbuktu",
    "Gao",
    "Kidal",
    "Mopti",
    "Sikasso",
    "Kayes",
    "Ouagadougou",
    "Bobo-Dioulasso",
    "Niamey",
    "Agadez",
    "Zinder",
    "Kinshasa",
    "Kigali",
    "Bamako",
    "Khartoum",
    "Kampala",
    "Djibouti",
]

MONTHS_EN = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
}
MONTHS_FR = {
    1: "janvier",
    2: "février",
    3: "mars",
    4: "avril",
    5: "mai",
    6: "juin",
    7: "juillet",
    8: "août",
    9: "septembre",
    10: "octobre",
    11: "novembre",
    12: "décembre",
}
MONTH_LOOKUP = {
    **{v.lower(): k for k, v in MONTHS_EN.items()},
    **{v.lower(): k for k, v in MONTHS_FR.items()},
    "fevrier": 2,
    "aout": 8,
    "decembre": 12,
}

DATELINE_RE = re.compile(
    r"""^
    (?:
        (?P<city>[A-Za-zÀ-ÿ.'’\-\s]+?)
        (?:,\s*(?:DRC|RDC|North Kivu|Sud-Kivu|Nord-Kivu|Ituri|Lualaba|Tanganyika|Uganda|Ouganda|Mali|Sudan|Soudan|Rwanda|Niger|Burkina(?:\s+Faso)?|Djibouti))?
        [,\s]+
    )?
    (?:le\s+)?
    (?:
        (?P<mon1>January|February|March|April|May|June|July|August|September|October|November|December|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)
        \s+(?P<day1>\d{1,2})(?:er)?
        (?:,)?\s+
        (?P<year1>\d{4})
      |
        (?P<day2>\d{1,2})(?:er)?
        \s+
        (?P<mon2>January|February|March|April|May|June|July|August|September|October|November|December|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)
        \s+
        (?P<year2>\d{4})
    )
    (?:\s*[-–—:;,]+|\s+)
    """,
    re.IGNORECASE | re.VERBOSE,
)


def parse_published(iso: str) -> datetime | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


def format_en(city: str, dt: datetime) -> str:
    return f"{city}, {MONTHS_EN[dt.month]} {dt.day}, {dt.year} - "


def format_fr(city: str, dt: datetime) -> str:
    day = "1er" if dt.day == 1 else str(dt.day)
    return f"{city}, le {day} {MONTHS_FR[dt.month]} {dt.year} - "


def looks_french(text: str) -> bool:
    return bool(re.search(r"[àâäéèêëïîôùûüçœ]", (text or "")[:900], re.I))


def infer_city(body: str, country: str) -> str:
    head = body[:180]
    for city in sorted(KNOWN_CITIES, key=len, reverse=True):
        if re.match(rf"{re.escape(city)}\b", head, re.I):
            if city.lower() in {"washington dc", "washington d.c.", "washington, d.c."}:
                return "Washington"
            if city.lower() == "djibouti city":
                return "Djibouti"
            if city.lower() == "port sudan":
                return "Port-Soudan"
            return city
    return CITY_BY_COUNTRY.get((country or "").upper(), "Africa")


# "Kinshasa, DRC -" / "Beni, North Kivu -" / "KINSHASA, Democratic Republic of Congo -"
CITY_PLACE_RE = re.compile(
    r"""^
    (?P<city>[A-Za-zÀ-ÿ.'’\-][A-Za-zÀ-ÿ.'’\-\s]{1,40}?)
    ,\s*
    (?P<place>
        DRC|RDC|DR\s*Congo|Democratic\s+Republic\s+of\s+(?:the\s+)?Congo|
        République\s+[Dd]émocratique\s+du\s+Congo|
        North\s+Kivu|Nord[\s-]Kivu|South\s+Kivu|Sud[\s-]Kivu|Ituri|Lualaba|Tanganyika|
        Haut[\s-]Katanga|Haut[\s-]Uele|Kasai|Maniema|Kongo\s+Central|
        Uganda|Ouganda|Mali|Sudan|Soudan|Rwanda|Niger|Burkina(?:\s+Faso)?|Djibouti|
        Kenya|Nigeria|Switzerland|Suisse|Ethiopia|Éthiopie|
        United\s+States|USA|France|Belgium|Belgique|UK|United\s+Kingdom|
        Central\s+African\s+Republic|CAR|RCA
    )
    \s*[-–—:,]+\s*
    """,
    re.IGNORECASE | re.VERBOSE,
)

# "Bamako, June 5-June 30, 2026 -" / "NEW YORK, May 5-8, 2026 -"
RANGE_DATELINE_RE = re.compile(
    r"""^
    (?P<city>[A-Za-zÀ-ÿ.'’\-][A-Za-zÀ-ÿ.'’\-\s]{1,40}?)
    ,\s*
    (?:le\s+)?
    (?:
        (?P<mon>January|February|March|April|May|June|July|August|September|October|November|December|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)
        \s+(?P<d1>\d{1,2})(?:er)?
        \s*[-–—]\s*
        (?:(?P<mon2>January|February|March|April|May|June|July|August|September|October|November|December|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+)?
        (?P<d2>\d{1,2})(?:er)?
        ,\s*(?P<year>\d{4})
    )
    \s*[-–—:,]+\s*
    """,
    re.IGNORECASE | re.VERBOSE,
)


def strip_dateline(body: str) -> tuple[str, datetime | None, str | None]:
    text = (body or "").replace("\u2014", "-").replace("\u2013", "-").lstrip()
    text = re.sub(r"^[\s\-–—:;,]+", "", text)
    match = DATELINE_RE.match(text)
    dt = None
    city = None
    rest = text
    if match:
        city_raw = (match.group("city") or "").strip(" ,")
        # Reject sentence-like "cities" (e.g. "... doors on June 30, 2026, marking")
        if city_raw and (
            len(city_raw) > 40
            or city_raw.count(" ") > 3
            or city_raw.lower().startswith(("the ", "a ", "an ", "le ", "la ", "les "))
        ):
            return text, None, None
        if city_raw and city_raw.lower() not in {"drc", "rdc"}:
            city = city_raw
        mon = match.group("mon1") or match.group("mon2")
        day = match.group("day1") or match.group("day2")
        year = match.group("year1") or match.group("year2")
        if mon and day and year:
            month = MONTH_LOOKUP[mon.lower()]
            dt = datetime(int(year), month, int(day))
        rest = text[match.end() :].lstrip(" -–—:;,")
    rest = rest.replace("\u2014", "-").replace("\u2013", "-")
    return rest, dt, city


def strip_all_lead_prefixes(body: str) -> tuple[str, datetime | None, str | None]:
    """Strip stacked datelines / city-country prefixes until the narrative starts."""
    rest = (body or "").replace("\u2014", "-").replace("\u2013", "-").lstrip()
    best_dt = None
    best_city = None
    for _ in range(6):
        before = rest
        rest2, dt, city = strip_dateline(rest)
        if dt and not best_dt:
            best_dt = dt
        if city and not best_city:
            best_city = city
        if rest2 != rest:
            rest = rest2.lstrip()
            continue
        place = CITY_PLACE_RE.match(rest)
        if place:
            city_raw = (place.group("city") or "").strip(" ,")
            if city_raw and not best_city and city_raw.lower() not in {"drc", "rdc"}:
                best_city = city_raw
            rest = rest[place.end() :].lstrip(" -–—:;,")
            continue
        ranged = RANGE_DATELINE_RE.match(rest)
        if ranged:
            city_raw = (ranged.group("city") or "").strip(" ,")
            if city_raw and not best_city and city_raw.lower() not in {"drc", "rdc"}:
                best_city = city_raw
            mon = ranged.group("mon")
            day = ranged.group("d1")
            year = ranged.group("year")
            if mon and day and year and not best_dt:
                best_dt = datetime(int(year), MONTH_LOOKUP[mon.lower()], int(day))
            rest = rest[ranged.end() :].lstrip(" -–—:;,")
            continue
        if rest == before:
            break
    return rest, best_dt, best_city


def apply_dateline(body: str, country: str, published: str, locale: str) -> str:
    rest, parsed_dt, parsed_city = strip_all_lead_prefixes(body)
    dt = parsed_dt or parse_published(published)
    if not dt:
        return (body or "").replace("\u2014", "-").replace("\u2013", "-")
    city = parsed_city or infer_city(body or "", country)
    # Avoid treating a full sentence as city
    if city and (len(city) > 40 or " " in city and city.count(" ") > 3):
        city = infer_city(body or "", country)
    prefix = format_fr(city, dt) if locale == "fr" else format_en(city, dt)
    rest = rest.lstrip()
    if not rest:
        rest = (body or "").strip()
    paras = rest.split("\n", 1)
    lead = paras[0].strip()
    tail = paras[1] if len(paras) > 1 else ""
    lead = re.sub(r"^[\-–—]+\s*", "", lead)
    # Guard: never leave "City, date - City, ..."
    if lead.lower().startswith(city.lower() + ","):
        rest2, _, _ = strip_all_lead_prefixes(lead)
        if rest2.strip():
            lead = rest2.strip()
    rebuilt = prefix + lead
    if tail:
        return rebuilt + "\n" + tail
    if not rebuilt.endswith("\n"):
        rebuilt += "\n"
    return rebuilt


def main() -> None:
    items = json.loads(SEED.read_text())
    changed = 0
    for item in items:
        country = item.get("country") or ""
        published = item.get("publishedAt") or ""
        new_en = apply_dateline(item.get("body_en") or "", country, published, "en")
        fr_locale = "fr" if looks_french(item.get("body_fr") or "") else "en"
        # Always FR dateline on FR body when the body is actually French
        new_fr = apply_dateline(
            item.get("body_fr") or "",
            country,
            published,
            "fr" if fr_locale == "fr" else "en",
        )
        if new_en != item.get("body_en"):
            item["body_en"] = new_en
            changed += 1
        if new_fr != item.get("body_fr"):
            item["body_fr"] = new_fr
            changed += 1
        for key in ("excerpt", "excerpt_en", "title", "title_en"):
            if isinstance(item.get(key), str):
                item[key] = item[key].replace("\u2014", "-").replace("\u2013", "-")
    SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print(f"updated_fields={changed} articles={len(items)}")


if __name__ == "__main__":
    main()
