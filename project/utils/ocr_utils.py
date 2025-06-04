import numpy as np
from PIL import Image
import pytesseract
import easyocr
try:
    from paddleocr import PaddleOCR
except Exception:  # pragma: no cover - optional dependency may be missing
    PaddleOCR = None


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


def extract_text_paddleocr(image: Image.Image) -> str:
    """Run PaddleOCR on a PIL image."""
    if PaddleOCR is None:
        raise RuntimeError("PaddleOCR library is not installed")
    try:
        ocr = PaddleOCR(use_angle_cls=True, lang="en")
        result = ocr.ocr(np.array(image), cls=True)
        lines = []
        for line in result:
            if not line:
                continue
            lines.append(line[1][0])
        return "\n".join(lines)
    except Exception as exc:
        raise RuntimeError(f"PaddleOCR failed: {exc}") from exc
