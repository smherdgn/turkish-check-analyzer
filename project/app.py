import json
import os
from pathlib import Path
from typing import List

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from utils.image_utils import preprocess_image
from utils.ocr_utils import extract_text_easyocr, extract_text_tesseract


OLLAMA_API_BASE_URL = os.getenv("OLLAMA_API_BASE_URL", "http://localhost:11434")
PROMPT_PATH = Path(__file__).parent / "prompts" / "check_prompt.txt"

app = FastAPI(title="Turkish Check Analyzer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_prompt() -> str:
    if not PROMPT_PATH.exists():
        raise HTTPException(status_code=500, detail="Prompt file missing.")
    return PROMPT_PATH.read_text(encoding="utf-8")


@app.get("/api/ollama-models")
def list_ollama_models():
    try:
        resp = requests.get(f"{OLLAMA_API_BASE_URL}/api/tags", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        # Newer Ollama returns {"models": [...]}
        if isinstance(data, dict) and "models" in data:
            return data["models"]
        return data
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service at {OLLAMA_API_BASE_URL} not reachable. {exc}",
        ) from exc


@app.post("/api/ocr-check")
async def ocr_check(
    image_file: UploadFile = File(...),
    selected_models_json: str = Form(...),
):
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if image_file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file type. Please upload a PNG, JPG, or WEBP file.",
        )

    try:
        selected_models = json.loads(selected_models_json)
        if not isinstance(selected_models, list) or not all(
            isinstance(m, str) for m in selected_models
        ):
            raise ValueError
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="selected_models_json is missing or invalid.",
        )

    image_bytes = await image_file.read()
    try:
        processed_image = preprocess_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Image preprocessing failed: {exc}") from exc

    # Run OCR
    ocr_text_tesseract = None
    ocr_text_easyocr = None
    try:
        ocr_text_tesseract = extract_text_tesseract(processed_image)
    except Exception as exc:
        ocr_text_tesseract = None
        print(f"Tesseract error: {exc}")
    try:
        ocr_text_easyocr = extract_text_easyocr(processed_image)
    except Exception as exc:
        ocr_text_easyocr = None
        print(f"EasyOCR error: {exc}")

    if not ocr_text_tesseract and not ocr_text_easyocr:
        raise HTTPException(
            status_code=422,
            detail="OCR processing failed: No text could be extracted from the image after pre-processing.",
        )

    combined_text = "\n".join(filter(None, [ocr_text_tesseract, ocr_text_easyocr]))

    prompt_template = load_prompt()
    final_prompt = prompt_template.replace("${ocr_text}", combined_text)

    analyses = []
    for model in selected_models:
        clean_model = model.strip()
        try:
            resp = requests.post(
                f"{OLLAMA_API_BASE_URL}/api/generate",
                json={"model": clean_model, "prompt": final_prompt, "stream": False},
                timeout=180,
            )
            resp.raise_for_status()
            resp_data = resp.json()
            response_text = resp_data.get("response", "")
            analysis = json.loads(response_text)
            analyses.append({"model_name": model, "analysis": analysis, "error": None})
        except Exception as exc:
            analyses.append({"model_name": model, "analysis": None, "error": str(exc)})

    if all(item["analysis"] is None for item in analyses):
        raise HTTPException(
            status_code=503,
            detail=f"Ollama service at {OLLAMA_API_BASE_URL} not reachable or all selected models failed.",
        )

    return JSONResponse(
        {
            "raw_ocr_tesseract": ocr_text_tesseract,
            "raw_ocr_easyocr": ocr_text_easyocr,
            "llm_analyses": analyses,
        }
    )
