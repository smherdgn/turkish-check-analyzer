import io
import os
import sys
import types
from PIL import Image
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class _DummyReader:
    def __init__(self, *args, **kwargs):
        pass
    def readtext(self, img):
        return []

sys.modules.setdefault('easyocr', types.SimpleNamespace(Reader=_DummyReader))

from utils.image_utils import preprocess_image
from utils import ocr_utils


def create_dummy_image_bytes() -> bytes:
    img = Image.new("RGB", (10, 10), color="white")
    b = io.BytesIO()
    img.save(b, format="PNG")
    return b.getvalue()


def test_preprocess_image_returns_image():
    data = create_dummy_image_bytes()
    result = preprocess_image(data)
    assert isinstance(result, Image.Image)


def test_extract_text_tesseract_success(monkeypatch):
    called = {}
    def fake_image_to_string(image, lang=None):
        called['lang'] = lang
        return "hello"
    monkeypatch.setattr(ocr_utils.pytesseract, "image_to_string", fake_image_to_string)
    img = Image.new("RGB", (10, 10))
    text = ocr_utils.extract_text_tesseract(img)
    assert text == "hello"
    assert called['lang'] == "tur+eng"


def test_extract_text_tesseract_failure(monkeypatch):
    def fake_image_to_string(image, lang=None):
        raise ValueError('boom')
    monkeypatch.setattr(ocr_utils.pytesseract, "image_to_string", fake_image_to_string)
    img = Image.new("RGB", (10, 10))
    with pytest.raises(RuntimeError):
        ocr_utils.extract_text_tesseract(img)


def test_extract_text_easyocr_success(monkeypatch):
    class Reader:
        def __init__(self, langs, gpu=False):
            pass
        def readtext(self, array):
            return [[None, 'text', None]]
    dummy_module = types.SimpleNamespace(Reader=Reader)
    monkeypatch.setitem(sys.modules, 'easyocr', dummy_module)
    monkeypatch.setattr(ocr_utils, 'easyocr', dummy_module)
    img = Image.new("RGB", (10, 10))
    text = ocr_utils.extract_text_easyocr(img)
    assert text == 'text'
