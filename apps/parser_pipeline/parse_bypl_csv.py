from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent
DEFAULT_CSV_PATH = BASE_DIR / "csv" / "BYPL_WITH_DSR.csv"
DEFAULT_OUTPUT_PATH = (
    REPO_ROOT / "supabase" / "seed" / "schedules" / "bypl" / "bypl.parsed.json"
)
MANIFEST_PATH = REPO_ROOT / "supabase" / "seed" / "manifest.json"
UNITS_PATH = REPO_ROOT / "supabase" / "seed" / "units.json"
WHITESPACE_RE = re.compile(r"\s+")

UNIT_ALIASES = {
    "cum": "cum",
    "cum (dsr 2012)": "cum",
    "cm": "cm",
    "ea": "each",
    "ea (dsr 2012)": "each",
    "ea set": "each",
    "each": "each",
    "kg": "kg",
    "m": "metre",
    "m (dsr 2012)": "metre",
    "mtr": "metre",
    "per bag of 50 kg cement used in the mix": "per bag of 50kg cement used in the mix",
    "per litre": "litre",
    "per cm depth per cm width per mtr length": "per cm depth per cm width per metre length",
    "sqm": "sqm",
    "sqm (dsr 2012)": "sqm",
}


def main() -> None:
    args = parse_args()
    csv_path = args.csv.expanduser().resolve()
    output_path = args.output.expanduser().resolve()
    known_units = load_known_units(args.units.expanduser().resolve())
    dsr_reference_metadata = load_dsr_reference_metadata(
        args.manifest.expanduser().resolve()
    )
    parsed = parse_bypl_csv(csv_path, known_units, dsr_reference_metadata)
    output_path.write_text(json.dumps(parsed, indent=2, ensure_ascii=False) + "\n")
    print(f"Parsed: {csv_path}")
    print(f"Output: {output_path}")
    print(
        "Summary:"
        f" rows={parsed['children_count']}"
        f" synthetic_codes={parsed['verification']['synthetic_code_count']}"
        f" references={parsed['verification']['reference_annotation_count']}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse the BYPL schedule CSV into reviewable JSON."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"Input CSV path (default: {DEFAULT_CSV_PATH})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT_PATH})",
    )
    parser.add_argument(
        "--units",
        type=Path,
        default=UNITS_PATH,
        help=f"Units definition path (default: {UNITS_PATH})",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help=f"Seed manifest path (default: {MANIFEST_PATH})",
    )
    return parser.parse_args()


def load_known_units(units_path: Path) -> set[str]:
    units_doc = json.loads(units_path.read_text(encoding="utf-8"))
    return {entry["symbol"] for entry in units_doc["units"]}


def load_dsr_reference_metadata(manifest_path: Path) -> dict[str, str]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for source in manifest.get("sources", []):
        schedule_source = source.get("schedule_source", {})
        if schedule_source.get("name") != "DSR":
            continue
        versions = source.get("versions", [])
        if not versions:
            break
        version = versions[0].get("schedule_source_version", {})
        version_id = normalize_text(version.get("id"))
        version_name = normalize_text(version.get("name"))
        if not version_id:
            break
        return {
            "reference_schedule_source_name": normalize_text(
                schedule_source.get("name")
            ),
            "reference_schedule_source_version_id": version_id,
            "reference_schedule_source_version_name": version_name,
        }
    raise SystemExit(f"Could not resolve DSR version metadata from {manifest_path}")


def parse_bypl_csv(
    csv_path: Path, known_units: set[str], dsr_reference_metadata: dict[str, str]
) -> dict[str, Any]:
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        items = [
            build_item(
                row=row,
                row_index=row_index,
                known_units=known_units,
                dsr_reference_metadata=dsr_reference_metadata,
            )
            for row_index, row in enumerate(reader)
        ]

    seen_codes: set[str] = set()
    duplicate_codes: list[str] = []
    synthetic_codes = 0
    reference_annotations = 0

    for item in items:
        code = item["code"]
        if code in seen_codes:
            duplicate_codes.append(code)
        seen_codes.add(code)
        if code.startswith("BYPL-"):
            synthetic_codes += 1
        reference_annotations += sum(
            1 for annotation in item["annotations"] if annotation["type"] == "reference"
        )

    if duplicate_codes:
        duplicates = ", ".join(sorted(set(duplicate_codes)))
        raise SystemExit(f"Duplicate item codes found: {duplicates}")

    return {
        "node_type": "root",
        "source_pdf": "",
        "children_count": len(items),
        "children": items,
        "verification": {
            "row_count": len(items),
            "duplicate_codes": duplicate_codes,
            "synthetic_code_count": synthetic_codes,
            "reference_annotation_count": reference_annotations,
        },
    }


def build_item(
    row: dict[str, str | None],
    row_index: int,
    known_units: set[str],
    dsr_reference_metadata: dict[str, str],
) -> dict[str, Any]:
    serial_number = normalize_text(row.get("S.NO."))
    description = normalize_text(row.get("DESCRIPTION OF ITEM"))
    service_code = normalize_text(row.get("SERVICE CODE"))
    dsr_code = normalize_text(row.get("DSR CODE"))
    rate = parse_rate(row.get("Rate"), serial_number)
    unit = normalize_unit(row.get("UNIT"), serial_number, known_units)

    if not description:
        raise SystemExit(f"Missing description for row {serial_number or row_index + 1}")
    if not dsr_code:
        raise SystemExit(f"Missing DSR CODE for row {serial_number or row_index + 1}")

    code = service_code or build_synthetic_code(serial_number, row_index)
    annotations = [
        {
            "type": "reference",
            "text": dsr_code,
            "order_index": 0,
            "metadata": dict(dsr_reference_metadata),
        }
    ]

    if not service_code:
        annotations.append(
            {
                "type": "note",
                "text": f"Synthetic code generated from S.NO. {serial_number}: {code}",
                "order_index": 1,
            }
        )

    return {
        "node_type": "item",
        "title": description,
        "code": code,
        "unit": unit,
        "rate": rate,
        "annotations": annotations,
        "children_count": 0,
        "order_index": row_index,
    }


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return WHITESPACE_RE.sub(" ", value).strip()


def normalize_unit(
    raw_unit: str | None, serial_number: str, known_units: set[str]
) -> str:
    normalized = normalize_text(raw_unit).lower()
    canonical = UNIT_ALIASES.get(normalized)
    if not canonical:
        raise SystemExit(f"Unknown unit '{raw_unit}' for row {serial_number}")
    if canonical not in known_units:
        raise SystemExit(
            f"Canonical unit '{canonical}' is not present in units.json for row {serial_number}"
        )
    return canonical


def parse_rate(raw_rate: str | None, serial_number: str) -> float:
    text = normalize_text(raw_rate)
    if not text:
        raise SystemExit(f"Missing rate for row {serial_number}")
    try:
        return float(text)
    except ValueError as exc:
        raise SystemExit(f"Invalid rate '{raw_rate}' for row {serial_number}") from exc


def build_synthetic_code(serial_number: str, row_index: int) -> str:
    if serial_number:
        return f"BYPL-{serial_number}"
    return f"BYPL-ROW-{row_index + 1}"


if __name__ == "__main__":
    main()
