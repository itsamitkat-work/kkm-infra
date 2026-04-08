#!/usr/bin/env python3
"""
Collect unique `unit` values from all *.parsed.json under
supabase/seed/schedules/cpwd_dsr/ and write supabase/seed/units.json for ensure-units.

Known CPWD symbols get stable name/display/dimension/conversion metadata;
any other symbol gets a slug name, display_name = symbol, dimension=misc.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEDULES_DIR = REPO_ROOT / "supabase/seed/schedules/cpwd_dsr"
DEFAULT_OUTPUT = REPO_ROOT / "supabase/seed/units.json"

# Metadata for symbols that appear in DSR / CPWD schedules (extend as needed).
SYMBOL_META: dict[str, dict[str, Any]] = {
    "sqm": {
        "name": "square_meter",
        "display_name": "Square Metre",
        "dimension": "area",
        "is_base": True,
        "conversion_factor": 1,
    },
    "cum": {
        "name": "cubic_meter",
        "display_name": "Cubic Metre",
        "dimension": "volume",
        "is_base": True,
        "conversion_factor": 1,
    },
    "metre": {
        "name": "metre",
        "display_name": "Metre",
        "dimension": "length",
        "is_base": True,
        "conversion_factor": 1,
    },
    "metre depth": {
        "name": "metre_depth",
        "display_name": "Metre depth",
        "dimension": "length",
        "is_base": False,
        "conversion_factor": 1,
    },
    "kg": {
        "name": "kilogram",
        "display_name": "Kilogram",
        "dimension": "mass",
        "is_base": True,
        "conversion_factor": 1,
    },
    "litre": {
        "name": "litre",
        "display_name": "Litre",
        "dimension": "volume",
        "is_base": False,
        "conversion_factor": 0.001,
    },
    "each": {
        "name": "each",
        "display_name": "Each",
        "dimension": "count",
        "is_base": True,
        "conversion_factor": 1,
    },
    "LS": {
        "name": "lump_sum",
        "display_name": "Lump Sum",
        "dimension": "count",
        "is_base": False,
        "conversion_factor": 1,
    },
    "rm": {
        "name": "running_metre",
        "display_name": "Running Metre",
        "dimension": "length",
        "is_base": False,
        "conversion_factor": 1,
    },
    "qtl": {
        "name": "quintal",
        "display_name": "Quintal",
        "dimension": "mass",
        "is_base": False,
        "conversion_factor": 100,
    },
    "tonne": {
        "name": "tonne",
        "display_name": "Tonne",
        "dimension": "mass",
        "is_base": False,
        "conversion_factor": 1000,
    },
}


def slug_name(symbol: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", symbol.strip().lower())
    s = s.strip("_")
    return s or "unit"


def default_meta(symbol: str) -> dict[str, Any]:
    return {
        "name": slug_name(symbol),
        "display_name": symbol.strip(),
        "dimension": "misc",
        "is_base": False,
        "conversion_factor": 1,
    }


def walk_collect_units(obj: Any, out: set[str]) -> None:
    if isinstance(obj, dict):
        u = obj.get("unit")
        if isinstance(u, str) and u.strip():
            out.add(u.strip())
        for v in obj.values():
            walk_collect_units(v, out)
    elif isinstance(obj, list):
        for x in obj:
            walk_collect_units(x, out)


def build_unit_row(symbol: str) -> dict[str, Any]:
    base = dict(SYMBOL_META.get(symbol, default_meta(symbol)))
    base["symbol"] = symbol
    return base


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate units.json from schedule parsed JSON.")
    ap.add_argument(
        "--schedules-dir",
        type=Path,
        default=DEFAULT_SCHEDULES_DIR,
        help=f"Directory to scan for *.parsed.json (default: supabase/seed/schedules/cpwd_dsr)",
    )
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output path (default: {DEFAULT_OUTPUT})",
    )
    args = ap.parse_args()

    schedules_dir: Path = args.schedules_dir.expanduser().resolve()
    if not schedules_dir.is_dir():
        raise SystemExit(f"Not a directory: {schedules_dir}")

    symbols: set[str] = set()
    for path in sorted(schedules_dir.rglob("*.parsed.json")):
        walk_collect_units(json.loads(path.read_text(encoding="utf-8")), symbols)

    if not symbols:
        raise SystemExit(f"No unit strings found under {schedules_dir}")

    rows = [build_unit_row(s) for s in sorted(symbols, key=str.lower)]
    used_names: set[str] = set()
    for row in rows:
        n = row["name"]
        if n not in used_names:
            used_names.add(n)
            continue
        slug = slug_name(row["symbol"])
        cand = f"{n}_{slug}"
        k = 0
        while cand in used_names:
            k += 1
            cand = f"{n}_{slug}_{k}"
        row["name"] = cand
        used_names.add(cand)

    out = {"units": rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(out, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {len(rows)} units to {args.output}")
    for r in rows:
        print(f"  {r['symbol']}: {r['name']} ({r['dimension']})")


if __name__ == "__main__":
    main()
