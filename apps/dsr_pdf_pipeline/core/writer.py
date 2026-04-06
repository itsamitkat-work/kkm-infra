
import fitz
import os
import logging

class PDFWriter:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.docs = {}

    def _get_doc(self, category, subhead):
        key = (category, subhead)
        if key not in self.docs:
            logging.info(f"Creating new PDF for {category}/{subhead}")
            self.docs[key] = fitz.open()
        return self.docs[key]

    def add_page(self, category, subhead, source_doc, page_number):
        doc = self._get_doc(category, subhead)
        doc.insert_pdf(source_doc, from_page=page_number, to_page=page_number)

    def save_all(self):
        for (category, subhead), doc in self.docs.items():
            folder = os.path.join(self.base_dir, category)
            os.makedirs(folder, exist_ok=True)
            path = os.path.join(folder, f"{subhead}.pdf")

            logging.info(f"Saving PDF: {path}")
            doc.save(path)
            doc.close()
