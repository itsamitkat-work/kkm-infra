import logging


class Router:
    def __init__(self, classifier, config):
        self.classifier = classifier
        self.config = config
        self.current_category = None
        self.current_subhead = None

    def process_page(self, page_data):
        text = page_data["text"]

        if len(text.strip()) < self.config["filters"]["min_text_length"]:
            logging.debug("Skipping short page %d", page_data["number"])
            return None

        category, subhead = self.classifier.classify_page(text)

        if category:
            self.current_category = category
        if subhead:
            self.current_subhead = subhead

        if not self.current_category or not self.current_subhead:
            return None

        return {
            "category": self.current_category,
            "subhead": self.current_subhead,
            "page_number": page_data["number"],
        }
