import numpy as np
from PIL import Image
import pytesseract
import easyocr


def extract_text_tesseract(image: Image.Image) -> str:
    """Run Tesseract OCR on a PIL image."""
    try:
        return pytesseract.image_to_string(image, lang="tur+eng")
    except Exception as exc:
        raise RuntimeError(f"Tesseract OCR failed: {exc}") from exc


def extract_text_easyocr(image: Image.Image) -> str:
    """Run EasyOCR on a PIL image."""
    try:
        reader = easyocr.Reader(["tr", "en"], gpu=True)
        results = reader.readtext(np.array(image))
        text = "\n".join([res[1] for res in results])
        return text
    except Exception as exc:
        raise RuntimeError(f"EasyOCR failed: {exc}") from exc
