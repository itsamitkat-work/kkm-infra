from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz


BASE_DIR = Path(__file__).resolve().parent
PDF_DIR = BASE_DIR / "pdfs"
HEADER_TOKENS = {"Code No", "Description", "Unit", "Rate"}
CODE_RE = re.compile(r"^(?:\d+[A-Z]*\.)*\d+[A-Z]*(?:\([a-z]\))?$")
MIN_CODE_HEAD_VALUE = 2
MAX_CODE_HEAD_VALUE = 26
NOTE_RE = re.compile(r"^Note\b", re.IGNORECASE)
PAGE_NUMBER_RE = re.compile(r"^\d+$")
SUBHEAD_HEADER_RE = re.compile(r"^SUB HEAD\s*:\s*(.+)$", re.IGNORECASE)
PERCENT_RATE_RE = re.compile(r"^\d+(?:\.\d+)?%$")
NUMERIC_RATE_RE = re.compile(r"^\d+(?:\.\d+)?$")
FILE_NAME_RE = re.compile(r"^(?P<code>\d+(?:\.\d+)?)\s+(?P<title>.+)\.pdf$")
UNIT_ALIASES = {
    "sqm": "sqm",
    "cum": "cum",
    "metre": "metre",
    "each": "each",
    "litre": "litre",
    "metre depth": "metre depth",
    "sqm per height metre": "sqm per height metre",
    "cm": "cm",
    "kg": "kg",
    "quintal": "quintal",
    "per bag of 50kg cement used": "per bag of 50kg cement used",
    "cum per metre depth": "cum per metre depth",
    "per cm depth per 100m": "per cm depth per 100m",
    "per metre per cm girth (60cm deep)": "per metre per cm girth (60cm deep)",
    "per test": "per test",
    "each hole": "each hole",
    "mt": "MT",
    "100 metre": "100 metre",
    "100 sqm": "100 sqm",
    "100 nos": "100 nos",
    "100nos": "100 nos",
    "100 kg": "100 kg",
    "10 nos": "10 nos",
    "joint": "joint",
    "each cut": "each cut",
    "pair": "pair",
    "per cm height per letter": "per cm height per letter",
    "per cm depth per cm width per metre length": "per cm depth per cm width per metre length",
    "1000 nos": "1000 nos",
    "1000nos": "1000 nos",
    "cum per metre span": "cum per metre span",
    "cum per meter span": "cum per metre span",
    "cum per metre height": "cum per metre height",
    "cum per meter height": "cum per metre height",
    "kg per metre span": "kg per metre span",
    "kg per meter span": "kg per metre span",
    "kg per metre height": "kg per metre height",
    "kg per meter height": "kg per metre height",
    "per wheel": "per wheel",
    "kilo litre": "kilo litre",
    "kilolitre": "kilo litre",
    "each job": "each job",
    "per bag of 50kg cement used in the mix": "per bag of 50kg cement used in the mix",
    "cm per metre": "cm per metre",
    "per letter per cm height": "per letter per cm height",
    "per bag of 50kg of cement": "per bag of 50kg of cement",
}

_TRAILING_UNIT_RATE_RE = re.compile(
    rf"\s+(?P<u>{'|'.join(re.escape(k) for k in sorted(UNIT_ALIASES.keys(), key=len, reverse=True))})\s+(?P<r>\d+(?:\.\d+)?)\s*$",
    re.IGNORECASE,
)


@dataclass
class LineToken:
    page_number: int
    text: str


@dataclass
class RawRow:
    code: str
    text: str
    unit: str | None
    rate: float | None
    rate_display: str | None
    rate_kind: str
    source_page: int


@dataclass
class Annotation:
    target_code: str
    text: str
    source_page: int
    annotation_type: str = "note"
    attach_fallback_code: str | None = None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse one DSR subhead PDF into reviewable JSON."
    )
    parser.add_argument(
        "--pdf",
        help="Path to a specific PDF. Defaults to the first PDF in ./pdfs.",
    )
    parser.add_argument(
        "--output",
        help="Optional output JSON path. Defaults beside the PDF as <name>.parsed.json.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Parse every *.pdf in ./pdfs (or --pdf-dir) and write <name>.parsed.json beside each.",
    )
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        help="Directory of PDFs (default: ./pdfs next to this script). Used with --all.",
    )
    args = parser.parse_args()

    pdf_dir = (
        args.pdf_dir.expanduser().resolve()
        if args.pdf_dir
        else PDF_DIR
    )

    if args.all:
        if args.pdf:
            raise SystemExit("Do not combine --pdf with --all")
        if args.output:
            raise SystemExit(
                "Do not combine --output with --all; each PDF gets <name>.parsed.json"
            )
        pdf_files = sorted(pdf_dir.glob("*.pdf"), key=natural_pdf_sort_key)
        if not pdf_files:
            raise SystemExit(f"No PDF files found in {pdf_dir}")

        failures: list[tuple[str, str]] = []
        for pdf_path in pdf_files:
            try:
                parsed = parse_pdf(pdf_path)
                output_path = resolve_output_path(pdf_path, None)
                output_path.write_text(
                    json.dumps(parsed, indent=2, ensure_ascii=False) + "\n"
                )
                summary = parsed["verification"]
                print(f"Parsed: {pdf_path.name} -> {output_path.name}")
                print(
                    "  "
                    f"rows={summary['row_count']}"
                    f" notes={summary['note_count']}"
                    f" leaves={summary['leaf_count']}"
                    f" duplicates={len(summary['duplicate_codes'])}"
                    f" orphans={len(summary['orphan_codes'])}"
                )
            except Exception as exc:
                failures.append((pdf_path.name, str(exc)))
                print(f"FAILED: {pdf_path.name}: {exc}")

        print(f"\nDone: {len(pdf_files) - len(failures)}/{len(pdf_files)} ok")
        if failures:
            for name, err in failures:
                print(f"  {name}: {err}")
            raise SystemExit(1)
        return

    pdf_path = resolve_pdf(args.pdf, pdf_dir)
    output_path = resolve_output_path(pdf_path, args.output)
    parsed = parse_pdf(pdf_path)
    output_path.write_text(json.dumps(parsed, indent=2, ensure_ascii=False) + "\n")

    summary = parsed["verification"]
    print(f"Parsed: {pdf_path.name}")
    print(f"Output: {output_path}")
    print(
        "Summary:"
        f" rows={summary['row_count']}"
        f" notes={summary['note_count']}"
        f" leaves={summary['leaf_count']}"
        f" duplicates={len(summary['duplicate_codes'])}"
        f" orphans={len(summary['orphan_codes'])}"
    )


def resolve_pdf(pdf_arg: str | None, pdf_dir: Path | None = None) -> Path:
    base = pdf_dir if pdf_dir is not None else PDF_DIR
    if pdf_arg:
        pdf_path = Path(pdf_arg).expanduser().resolve()
        if not pdf_path.exists():
            raise SystemExit(f"PDF not found: {pdf_path}")
        return pdf_path

    pdf_files = sorted(base.glob("*.pdf"), key=natural_pdf_sort_key)
    if not pdf_files:
        raise SystemExit(f"No PDF files found in {base}")
    return pdf_files[0]


def resolve_output_path(pdf_path: Path, output_arg: str | None) -> Path:
    if output_arg:
        return Path(output_arg).expanduser().resolve()
    return pdf_path.with_suffix(".parsed.json")


def parse_pdf(pdf_path: Path) -> dict[str, Any]:
    subhead_code, subhead_title = parse_subhead_from_filename(pdf_path)
    tokens = extract_tokens(pdf_path, subhead_code, subhead_title)
    rows, annotations = parse_tokens(tokens, subhead_code)
    root, verification = build_tree(
        pdf_path=pdf_path,
        subhead_code=subhead_code,
        subhead_title=subhead_title,
        rows=rows,
        annotations=annotations,
    )
    root["verification"] = verification
    return root


def parse_subhead_from_filename(pdf_path: Path) -> tuple[str, str]:
    match = FILE_NAME_RE.match(pdf_path.name)
    if match:
        return match.group("code"), match.group("title")
    return pdf_path.stem, pdf_path.stem


def extract_tokens(pdf_path: Path, subhead_code: str, subhead_title: str) -> list[LineToken]:
    tokens: list[LineToken] = []
    doc = fitz.open(pdf_path)
    repeated_title = f"{subhead_code} {subhead_title}".strip().upper()

    try:
        for page_number, page in enumerate(doc, start=1):
            for raw_line in page.get_text().splitlines():
                line = normalize_line(raw_line)
                if not line:
                    continue
                if line in HEADER_TOKENS:
                    continue
                if PAGE_NUMBER_RE.match(line):
                    continue
                if SUBHEAD_HEADER_RE.match(line):
                    continue
                if line.upper() == repeated_title:
                    continue
                tokens.append(LineToken(page_number=page_number, text=line))
    finally:
        doc.close()

    return tokens


def normalize_line(raw_line: str) -> str:
    return " ".join(raw_line.replace("\xa0", " ").split())


def parse_tokens(
    tokens: list[LineToken], subhead_code: str
) -> tuple[list[RawRow], list[Annotation]]:
    rows: list[RawRow] = []
    annotations: list[Annotation] = []
    index = 0
    last_code: str | None = None

    while index < len(tokens):
        token = tokens[index]

        if is_code(token.text):
            row, index = parse_row(tokens, index)
            rows.append(row)
            last_code = row.code
            continue

        if is_note(token.text):
            note, index = parse_note(tokens, index, last_code, subhead_code)
            annotations.append(note)
            continue

        index += 1

    return rows, annotations


def parse_row(tokens: list[LineToken], start_index: int) -> tuple[RawRow, int]:
    code = tokens[start_index].text
    source_page = tokens[start_index].page_number
    description_parts: list[str] = []
    unit: str | None = None
    rate: float | None = None
    rate_display: str | None = None
    rate_kind = "amount"
    index = start_index + 1

    while index < len(tokens):
        token = tokens[index]
        line = token.text

        if is_code(line) or is_note(line):
            break

        matched_unit, consumed = match_unit(tokens, index)
        if unit is None and matched_unit:
            unit = matched_unit
            next_index = index + consumed
            if next_index < len(tokens):
                rate_value = parse_rate(tokens[next_index].text)
                if rate_value:
                    rate, rate_display, rate_kind = rate_value
                    index = next_index + 1
                    break
            index = next_index
            continue

        description_parts.append(line)
        index += 1

    text = " ".join(description_parts).strip()
    if rate is None:
        text, split_unit, rate_tuple = split_trailing_unit_rate(text)
        if rate_tuple is not None:
            rate, rate_display, rate_kind = rate_tuple
            unit = split_unit if unit is None else unit

    return (
        RawRow(
            code=code,
            text=text,
            unit=unit,
            rate=rate,
            rate_display=rate_display,
            rate_kind=rate_kind,
            source_page=source_page,
        ),
        index,
    )


def parse_note(
    tokens: list[LineToken],
    start_index: int,
    last_code: str | None,
    subhead_code: str,
) -> tuple[Annotation, int]:
    parts = [tokens[start_index].text]
    source_page = tokens[start_index].page_number
    index = start_index + 1

    while index < len(tokens):
        line = tokens[index].text
        if is_code(line):
            break
        parts.append(line)
        index += 1

    full_text = " ".join(parts).strip()
    explicit = extract_note_target(full_text)
    if explicit:
        return (
            Annotation(
                target_code=explicit,
                text=full_text,
                source_page=source_page,
                attach_fallback_code=last_code,
            ),
            index,
        )
    tail = last_code if last_code else subhead_code
    return Annotation(target_code=tail, text=full_text, source_page=source_page), index


def match_unit(tokens: list[LineToken], index: int) -> tuple[str | None, int]:
    if index + 1 < len(tokens):
        two_line = normalize_unit(f"{tokens[index].text} {tokens[index + 1].text}")
        if two_line:
            return two_line, 2

    one_line = normalize_unit(tokens[index].text)
    if one_line:
        return one_line, 1

    return None, 0


def normalize_unit(text: str) -> str | None:
    normalized = text.lower().replace(".", " ")
    normalized = " ".join(normalized.split())
    return UNIT_ALIASES.get(normalized)


def split_trailing_unit_rate(
    description: str,
) -> tuple[str, str | None, tuple[float, str, str] | None]:
    if not description.strip():
        return description, None, None
    match = _TRAILING_UNIT_RATE_RE.search(description)
    if not match:
        return description, None, None
    unit_key = match.group("u")
    canonical = normalize_unit(unit_key)
    if canonical is None:
        return description, None, None
    rate_tuple = parse_rate(match.group("r"))
    if rate_tuple is None:
        return description, None, None
    prefix = description[: match.start()].rstrip()
    return prefix, canonical, rate_tuple


def parse_rate(text: str) -> tuple[float, str, str] | None:
    cleaned = text.replace(" ", "")
    if PERCENT_RATE_RE.match(cleaned):
        return float(cleaned[:-1]), cleaned, "percentage"
    if NUMERIC_RATE_RE.match(cleaned):
        return float(cleaned), cleaned, "amount"
    return None


def build_tree(
    pdf_path: Path,
    subhead_code: str,
    subhead_title: str,
    rows: list[RawRow],
    annotations: list[Annotation],
) -> tuple[dict[str, Any], dict[str, Any]]:
    subhead_node: dict[str, Any] = {
        "node_type": "subhead",
        "title": subhead_title,
        "code": subhead_code,
        "children": [],
    }

    code_to_node: dict[str, dict[str, Any]] = {subhead_code: subhead_node}
    duplicates: list[str] = []
    orphan_codes: list[str] = []
    leaf_count = 0

    for order_index, row in enumerate(rows):
        if row.code in code_to_node:
            duplicates.append(row.code)
            continue

        node = row_to_node(row=row, order_index=order_index)
        code_to_node[row.code] = node
        parent_code = derive_parent_code(row.code, subhead_code)
        parent_node = code_to_node.get(parent_code)

        if parent_node is None:
            orphan_codes.append(row.code)
            subhead_node["children"].append(node)
        else:
            parent_node["children"].append(node)

    attach_annotations(annotations, code_to_node)
    apply_group_node_types(subhead_node)
    subhead_node = reorder_node_keys(subhead_node)
    leaf_count = count_leaf_nodes(subhead_node)

    verification = {
        "source_pdf": str(pdf_path),
        "row_count": len(rows),
        "note_count": len(annotations),
        "leaf_count": leaf_count,
        "duplicate_codes": duplicates,
        "orphan_codes": orphan_codes,
        "unassigned_notes": [note.text for note in annotations if note.target_code == "unassigned"],
    }

    root = {
        "node_type": "root",
        "source_pdf": str(pdf_path),
        "children": [subhead_node],
    }
    return root, verification


def apply_group_node_types(node: dict[str, Any]) -> None:
    children = node.get("children") or []
    for child in children:
        apply_group_node_types(child)
    if node.get("node_type") != "item":
        return
    if not children or node.get("rate") is not None:
        return
    node["node_type"] = "group"


def row_to_node(row: RawRow, order_index: int) -> dict[str, Any]:
    node: dict[str, Any] = {
        "node_type": "item",
        "title": row.text,
        "code": row.code,
        "children": [],
        "order_index": order_index,
        "source_page": row.source_page,
    }

    if row.unit is not None:
        node["unit"] = row.unit
    if row.rate is not None:
        node["rate"] = row.rate
        node["rate_display"] = row.rate_display
    if row.rate_kind != "amount":
        node["rate_kind"] = row.rate_kind

    return node


def attach_annotations(
    annotations: list[Annotation], code_to_node: dict[str, dict[str, Any]]
) -> None:
    for order_index, annotation in enumerate(annotations):
        target_node = code_to_node.get(annotation.target_code)
        if target_node is None and annotation.attach_fallback_code:
            target_node = code_to_node.get(annotation.attach_fallback_code)
        if target_node is None:
            continue
        target_node.setdefault("annotations", []).append(
            {
                "type": annotation.annotation_type,
                "text": annotation.text,
                "source_page": annotation.source_page,
                "order_index": order_index,
            }
        )


def reorder_node_keys(node: dict[str, Any]) -> dict[str, Any]:
    ordered: dict[str, Any] = {}
    preferred_order = (
        "node_type",
        "title",
        "code",
        "annotations",
        "children_count",
        "children",
    )

    for key in preferred_order:
        if key not in node:
            continue
        value = node[key]
        if key == "children":
            value = [reorder_node_keys(child) for child in value]
            ordered["children_count"] = len(value)
        ordered[key] = value

    for key, value in node.items():
        if key in ordered:
            continue
        ordered[key] = value

    return ordered


def derive_parent_code(code: str, subhead_code: str) -> str:
    variant_match = re.match(r"^(.*)\([a-z]\)$", code)
    if variant_match:
        return variant_match.group(1)

    segments = code.split(".")
    if len(segments) <= 2:
        return subhead_code
    return ".".join(segments[:-1])


def count_leaf_nodes(node: dict[str, Any]) -> int:
    children = node.get("children", [])
    if not children:
        return 1 if node.get("node_type") == "item" else 0
    return sum(count_leaf_nodes(child) for child in children)


def extract_note_target(note_text: str) -> str | None:
    match = re.search(r"item\s+no\.\s*([0-9A-Za-z().]+)", note_text, re.IGNORECASE)
    if match:
        return _normalize_extracted_item_code(match.group(1))
    match = re.search(
        r"(?i)^Note\s+for\s+item\s+((?:\d+[A-Z]*\.)*\d+[A-Z]*)",
        note_text.strip(),
    )
    if match:
        return _normalize_extracted_item_code(match.group(1))
    return None


def _normalize_extracted_item_code(raw: str) -> str:
    return raw.strip().rstrip(".,;:)")


def is_code(text: str) -> bool:
    if not CODE_RE.match(text):
        return False
    head = text.split(".", 1)[0]
    head_digits = re.match(r"^(\d+)", head)
    if not head_digits:
        return False
    value = int(head_digits.group(1))
    return MIN_CODE_HEAD_VALUE <= value <= MAX_CODE_HEAD_VALUE


def is_note(text: str) -> bool:
    return bool(NOTE_RE.match(text))


def natural_pdf_sort_key(path: Path) -> tuple[int, ...]:
    match = re.match(r"^(\d+(?:\.\d+)?)", path.name)
    if not match:
        return (9999,)
    return tuple(int(part) for part in match.group(1).split("."))


if __name__ == "__main__":
    main()
