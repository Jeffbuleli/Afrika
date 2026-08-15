#!/usr/bin/env python3
"""Count articles still needing FR retranslation (same rules as retranslate script)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"


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


def main() -> None:
    items = json.loads(SEED.read_text())
    n = 0
    for it in items:
        bf = (it.get("body_fr") or "").strip()
        be = (it.get("body_en") or "").strip()
        title = it.get("title") or ""
        title_en = it.get("title_en") or ""
        if bf == be and be:
            n += 1
        elif title == title_en and title_en and not has_french_marks(title):
            n += 1
        elif is_englishish(bf) or is_englishish(title):
            n += 1
    print(n)


if __name__ == "__main__":
    main()
