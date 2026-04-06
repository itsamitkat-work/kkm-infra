
import fitz
import logging

def load_pdf(pdf_path):
    logging.info(f"Loading PDF: {pdf_path}")
    return fitz.open(pdf_path)

def extract_pages(doc):
    for page in doc:
        logging.debug(f"Extracting page {page.number}")
        yield {
            "number": page.number,
            "text": page.get_text(),
            "page": page
        }
