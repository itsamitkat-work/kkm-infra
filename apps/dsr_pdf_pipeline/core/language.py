
def is_hindi(text):
    return any('\u0900' <= ch <= '\u097F' for ch in text)
