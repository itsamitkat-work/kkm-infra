# DSR PDF Pipeline

Splits Delhi Schedule of Rates (DSR) PDF volumes into organized, per-subhead PDFs by reading the section markers (`SUB HEAD :` / `BASIC RATES :`) from each page.

## Setup

```bash
cd apps/dsr_pdf_pipeline
python3 -m pip install -r requirements.txt
```

Dependencies: **PyMuPDF**, **PyYAML**

## Usage

```bash
# Process all PDFs in the input/ folder (default)
python3 main.py

# Process specific files
python3 main.py input/DSR_Vol_1_Civil.pdf input/DSR_Vol_2_Civil.pdf

# Process a directory with custom output
python3 main.py input/ -o output
```

| Argument | Description |
|----------|-------------|
| `pdf` | PDF file(s) or directory. Defaults to `./input/` |
| `-o, --output` | Output directory. Defaults to `./output/` |

## Output Structure

```
output/
├── basic-rates/
│   ├── 0.1 HIRE CHARGES OF PLANTS & MACHINERY.pdf
│   ├── 0.2 LABOUR.pdf
│   └── 03 MATERIALS.pdf
└── items/
    ├── 1.0 CARRIAGE OF MATERIALS.pdf
    ├── 2.0 EARTH WORK.pdf
    ├── 3.0 MORTAR.pdf
    └── ...
```

## How It Works

```
PDF → Extractor (page-by-page)
    → Language Filter (skip Hindi pages)
    → Classifier (detect SUB HEAD / BASIC RATES footer markers)
    → Router (carry forward category/subhead across pages)
    → Writer (collect pages per subhead → save split PDFs)
```

1. **Extractor** — Loads the PDF with PyMuPDF and yields pages one at a time.
2. **Language Filter** — Drops pages containing Hindi script (configurable in `config.yaml`).
3. **Classifier** — Scans each page for footer/header markers like `SUB HEAD : 2.0 EARTH WORK` or `BASIC RATES : 0.1 HIRE CHARGES OF PLANTS & MACHINERY` to determine category and subhead.
4. **Router** — Maintains running state so pages without an explicit marker inherit the category/subhead from the previous page.
5. **Writer** — Groups pages by category + subhead and saves each group as a separate PDF under `output/<category>/<subhead>.pdf`.

## Configuration

`config.yaml`:

```yaml
filters:
  skip_hindi: true
  min_text_length: 50
```

| Key | Description |
|-----|-------------|
| `skip_hindi` | Skip pages containing Hindi (Devanagari) characters |
| `min_text_length` | Minimum extracted text length to process a page |
