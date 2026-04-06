import argparse
import glob
import os
import yaml
import logging
from core.extractor import load_pdf, extract_pages
from core.classifier import Classifier
from core.router import Router
from core.writer import PDFWriter
from core.language import is_hindi

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

logging.basicConfig(
    filename=os.path.join(BASE_DIR, "pipeline.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


def load_config():
    with open(os.path.join(BASE_DIR, "config.yaml")) as f:
        return yaml.safe_load(f)


def resolve_pdfs(paths):
    """Accept files and/or directories; return a sorted list of PDF paths."""
    pdfs = []
    for p in paths:
        if os.path.isdir(p):
            pdfs.extend(sorted(glob.glob(os.path.join(p, "*.pdf"))))
        elif os.path.isfile(p):
            pdfs.append(p)
        else:
            print(f"Warning: skipping {p} (not found)")
    return pdfs


def run_pipeline(pdf_paths: list, output_dir: str):
    config = load_config()
    classifier = Classifier()
    router = Router(classifier, config)
    writer = PDFWriter(output_dir)

    total_routed = 0
    total_skipped = 0

    for pdf_path in pdf_paths:
        logging.info("Processing %s", pdf_path)
        print(f"Processing {os.path.basename(pdf_path)} ...")

        doc = load_pdf(pdf_path)
        routed = 0
        skipped = 0

        for page in extract_pages(doc):
            text = page["text"]

            if config["filters"]["skip_hindi"] and is_hindi(text):
                logging.info("Skipping Hindi page %d", page["number"])
                skipped += 1
                continue

            result = router.process_page(page)

            if result:
                logging.info(
                    "Routing page %d → %s / %s",
                    result["page_number"],
                    result["category"],
                    result["subhead"],
                )
                writer.add_page(
                    result["category"],
                    result["subhead"],
                    doc,
                    result["page_number"],
                )
                routed += 1
            else:
                logging.debug("Skipping page %d (no match)", page["number"])
                skipped += 1

        doc.close()
        print(f"  → routed {routed}, skipped {skipped}")
        total_routed += routed
        total_skipped += skipped

    writer.save_all()

    print(f"\nDone — {len(pdf_paths)} file(s), {total_routed} pages routed, {total_skipped} skipped.")
    print(f"Output → {os.path.abspath(output_dir)}")
    logging.info(
        "Pipeline completed — files=%d routed=%d skipped=%d",
        len(pdf_paths), total_routed, total_skipped,
    )


def merge_folder(folder: str, output_file: str):
    """Merge all PDFs in a folder into a single PDF, sorted by subhead number."""
    import fitz

    pdf_files = sorted(
        glob.glob(os.path.join(folder, "*.pdf")),
        key=lambda f: _subhead_sort_key(os.path.basename(f)),
    )
    if not pdf_files:
        print(f"No PDFs found in {folder}")
        return

    merged = fitz.open()
    for path in pdf_files:
        src = fitz.open(path)
        merged.insert_pdf(src)
        src.close()

    merged.save(output_file)
    print(f"Merged {len(pdf_files)} files ({merged.page_count} pages) → {output_file}")
    merged.close()


def _subhead_sort_key(filename):
    """Extract leading number from filename for natural sort order."""
    import re
    m = re.match(r"(\d+(?:\.\d+)?)", filename)
    if m:
        parts = m.group(1).split(".")
        return tuple(int(p) for p in parts)
    return (999,)


def cmd_split(args):
    pdfs = resolve_pdfs(args.pdf)
    if not pdfs:
        print("Error: No PDF files found.")
        raise SystemExit(1)
    run_pipeline(pdfs, args.output)


def cmd_merge(args):
    output_dir = args.output
    for category in sorted(os.listdir(output_dir)):
        folder = os.path.join(output_dir, category)
        if not os.path.isdir(folder) or category.startswith("."):
            continue
        dest = os.path.join(output_dir, f"{category}.pdf")
        merge_folder(folder, dest)


def main():
    parser = argparse.ArgumentParser(
        description="DSR PDF Pipeline — split and merge DSR PDFs."
    )
    sub = parser.add_subparsers(dest="command")

    sp_split = sub.add_parser("split", help="Split DSR PDFs into category/subhead PDFs")
    sp_split.add_argument(
        "pdf",
        nargs="*",
        default=[os.path.join(BASE_DIR, "input")],
        help="PDF file(s) or directory (default: ./input/)",
    )
    sp_split.add_argument(
        "-o", "--output", default="output",
        help="Output directory (default: ./output)",
    )

    sp_merge = sub.add_parser("merge", help="Merge each category folder into one PDF")
    sp_merge.add_argument(
        "-o", "--output", default="output",
        help="Output directory containing split folders (default: ./output)",
    )

    args = parser.parse_args()

    if args.command == "split":
        cmd_split(args)
    elif args.command == "merge":
        cmd_merge(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
