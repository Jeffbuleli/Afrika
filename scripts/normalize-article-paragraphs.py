#!/usr/bin/env python3
"""Normalize article bodies: single newlines between paragraphs → blank lines."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "content" / "seed-all.json"


def normalize_paragraphs(text: str) -> str:
    if not text:
        return text
    out = (
        text.replace("\r\n", "\n")
        .replace("\u2014", "-")
        .replace("\u2013", "-")
    )
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    # Promote single newlines between non-empty lines to paragraph breaks
    out = re.sub(r"([^\n])\n(?!\n)([^\n])", r"\1\n\n\2", out)
    return out.strip() + "\n"


def main() -> None:
    items = json.loads(SEED.read_text())
    changed = 0
    for item in items:
        for key in ("body_en", "body_fr", "excerpt", "excerpt_en"):
            if key not in item or not isinstance(item[key], str):
                continue
            fixed = normalize_paragraphs(item[key]) if key.startswith("body") else item[key].replace("\u2014", "-").replace("\u2013", "-")
            if key.startswith("body"):
                if fixed != item[key]:
                    item[key] = fixed
                    changed += 1
            elif fixed != item[key]:
                item[key] = fixed
                changed += 1
        for key in ("title", "title_en", "coverImageAltFr", "coverImageAltEn"):
            if key in item and isinstance(item[key], str):
                item[key] = item[key].replace("\u2014", "-").replace("\u2013", "-")
    SEED.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n")
    print(f"normalized fields={changed} articles={len(items)}")


if __name__ == "__main__":
    main()
