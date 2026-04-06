import re
import logging

BASIC_RATES_RE = re.compile(
    r"BASIC\s+RATES?\s*:\s*(\S+)\s+(.+)"
)
SUB_HEAD_RE = re.compile(
    r"SUB\s+HEAD\s*:\s*(\S+)\s*(.*)"
)


def _clean_subhead(code, title):
    return f"{code} {title}".strip()


class Classifier:
    def classify_page(self, text):
        """Return (category, subhead) by looking for section markers.

        Markers appear as page headers/footers in DSR PDFs:
          BASIC RATES : 0.1 HIRE CHARGES OF PLANTS & MACHINERY
          SUB HEAD : 2.0 EARTH WORK
          SUB HEAD : 1.0          (title on next line)
          CARRIAGE OF MATERIALS
        """
        lines = [l.strip() for l in text.strip().splitlines() if l.strip()]

        for i, line in enumerate(lines):
            m = SUB_HEAD_RE.search(line)
            if m:
                code = m.group(1)
                title = m.group(2).strip()
                if title:
                    subhead = _clean_subhead(code, title)
                    logging.debug("Footer → items / %s", subhead)
                    return "items", subhead
                remaining = " ".join(l.strip() for l in lines[i + 1:])
                subhead = _clean_subhead(code, remaining)
                logging.debug("Footer (title page) → items / %s", subhead)
                return "items", subhead

        for line in lines:
            m = BASIC_RATES_RE.search(line)
            if m:
                code = m.group(1)
                title = m.group(2).strip()
                subhead = _clean_subhead(code, title)
                logging.debug("Footer → basic-rates / %s", subhead)
                return "basic-rates", subhead

        return None, None
