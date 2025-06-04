import io

import cv2
import numpy as np
from PIL import Image


def preprocess_image(image_bytes: bytes) -> Image.Image:
    """Preprocess an image for better OCR results.

    Steps:
    - Load image and convert to grayscale
    - Denoise using Gaussian blur and NLM
    - Correct skew based on text orientation
    - Apply adaptive thresholding
    """
    # Load with Pillow first
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = np.array(image)

    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # Denoise
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    gray = cv2.fastNlMeansDenoising(gray, h=30)

    # Adaptive threshold to get binary image
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
    )

    # Detect skew angle
    coords = np.column_stack(np.where(thresh > 0))
    if coords.size > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        (h, w) = thresh.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        thresh = cv2.warpAffine(
            thresh, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )

    processed = Image.fromarray(thresh)
    return processed
