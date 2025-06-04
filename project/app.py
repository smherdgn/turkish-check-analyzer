import asyncio
import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple, AsyncGenerator

import aiohttp
import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.background import BackgroundTasks

from utils.image_utils import preprocess_image
from utils.ocr_utils import (
    extract_text_easyocr,
    extract_text_tesseract,
    extract_text_paddleocr,
)

# ===== CONFIGURATION =====
OLLAMA_API_BASE_URL = os.getenv("OLLAMA_API_BASE_URL", "http://localhost:11434")
PROMPT_PATH = Path(__file__).parent / "prompts" / "check_prompt.txt"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ===== LOGGING SETUP =====
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("check_analyzer.log", encoding="utf-8")
    ]
)

logger = logging.getLogger("check_analyzer")

# ===== FASTAPI SETUP =====
app = FastAPI(title="Turkish Check Analyzer API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== PROGRESS TRACKING =====
# In-memory storage for progress tracking (use Redis in production)
progress_storage: Dict[str, Dict] = {}

class ProgressTracker:
    """Track and broadcast progress updates."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.start_time = time.time()
        progress_storage[session_id] = {
            "status": "initialized",
            "phase": 0,
            "total_phases": 6,
            "message": "Starting process...",
            "progress": 0,
            "start_time": self.start_time,
            "logs": [],
            "result": None,
            "error": None
        }
    
    def update(self, phase: int, status: str, message: str, details: Optional[Dict] = None):
        """Update progress and log."""
        elapsed = time.time() - self.start_time
        progress_percent = int((phase / 6) * 100)
        
        log_entry = {
            "timestamp": time.time(),
            "elapsed": round(elapsed, 2),
            "phase": phase,
            "status": status,
            "message": message,
            "details": details or {}
        }
        
        if self.session_id in progress_storage:
            progress_storage[self.session_id].update({
                "status": status,
                "phase": phase,
                "message": message,
                "progress": progress_percent,
                "elapsed": round(elapsed, 2)
            })
            progress_storage[self.session_id]["logs"].append(log_entry)
        
        # Log to console as well
        emoji = {"success": "✅", "error": "❌", "processing": "🔄", "info": "ℹ️"}.get(status, "📝")
        logger.info(f"{emoji} [{self.session_id[:8]}] Phase {phase}/6 ({progress_percent}%) - {message}")
        
        if details:
            logger.debug(f"🔍 [{self.session_id[:8]}] Details: {details}")
    
    def set_result(self, result: Dict):
        """Set final result."""
        if self.session_id in progress_storage:
            progress_storage[self.session_id]["result"] = result
            progress_storage[self.session_id]["status"] = "completed"
            progress_storage[self.session_id]["progress"] = 100
    
    def set_error(self, error: str):
        """Set error state."""
        if self.session_id in progress_storage:
            progress_storage[self.session_id]["error"] = error
            progress_storage[self.session_id]["status"] = "error"


# ===== HELPER FUNCTIONS =====

def validate_model_for_check_analysis(model_name: str) -> bool:
    """Validate if model is suitable for check analysis."""
    
    # Vision models - sadece görsel analiz yapar, JSON döndürmez
    vision_models = ['llava', 'bakllava', 'moondream', 'llava-phi3', 'llava-llama3']
    
    # Code models - kod yapar, çek analizi yapmaz  
    code_models = ['codellama', 'codegemma', 'starcoder', 'codeqwen', 'phind-codellama']
    
    # Embedding models - sadece embedding üretir
    embedding_models = ['nomic-embed', 'all-minilm', 'mxbai-embed', 'snowflake-arctic-embed']
    
    # Math/reasoning specific models that might not follow JSON format
    specialized_models = ['mathstral', 'nous-hermes2-mixtral', 'wizard-math']
    
    model_lower = model_name.lower()
    
    # Check against all unsupported categories
    unsupported_categories = vision_models + code_models + embedding_models + specialized_models
    
    for unsupported in unsupported_categories:
        if unsupported in model_lower:
            logger.info(f"🚫 Model {model_name} filtered out: contains '{unsupported}' (unsupported category)")
            return False
    
    # Additional checks for model size (very small models might not be good for complex analysis)
    if any(x in model_lower for x in ['1b', '0.5b', '512m', '256m']):
        logger.info(f"🚫 Model {model_name} filtered out: too small for complex analysis")
        return False
    
    return True

def filter_supported_models(models: List[Dict]) -> List[Dict]:
    """Filter models that are suitable for check analysis."""
    supported_models = []
    filtered_count = 0
    
    for model in models:
        model_name = model.get('name', '')
        if validate_model_for_check_analysis(model_name):
            supported_models.append(model)
            logger.debug(f"✅ Model {model_name} approved for check analysis")
        else:
            filtered_count += 1
    
    logger.info(f"📊 Model filtering: {len(supported_models)} approved, {filtered_count} filtered out")
    return supported_models

def load_prompt() -> str:
    """Load and return the prompt template."""
    if not PROMPT_PATH.exists():
        raise HTTPException(status_code=500, detail="Prompt file missing.")
    
    try:
        prompt_content = PROMPT_PATH.read_text(encoding="utf-8")
        return prompt_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read prompt: {e}")


async def run_ocr_parallel(processed_image, tracker: ProgressTracker) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Run OCR engines in parallel with progress tracking."""
    tracker.update(2, "processing", "Starting OCR engines in parallel...")
    
    async def run_tesseract():
        try:
            tracker.update(2, "processing", "Running Tesseract OCR...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, extract_text_tesseract, processed_image)
            tracker.update(2, "info", f"Tesseract completed: {len(result) if result else 0} characters")
            return result
        except Exception as e:
            tracker.update(2, "error", f"Tesseract failed: {str(e)}")
            return None
    
    async def run_easyocr():
        try:
            tracker.update(2, "processing", "Running EasyOCR...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, extract_text_easyocr, processed_image)
            tracker.update(2, "info", f"EasyOCR completed: {len(result) if result else 0} characters")
            return result
        except Exception as e:
            tracker.update(2, "error", f"EasyOCR failed: {str(e)}")
            return None

    async def run_paddleocr():
        try:
            tracker.update(2, "processing", "Running PaddleOCR...")
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, extract_text_paddleocr, processed_image)
            tracker.update(2, "info", f"PaddleOCR completed: {len(result) if result else 0} characters")
            return result
        except Exception as e:
            tracker.update(2, "error", f"PaddleOCR failed: {str(e)}")
            return None
    ocr_results = await asyncio.gather(
        run_tesseract(),
        run_easyocr(),
        run_paddleocr(),
        return_exceptions=True,
    )

    tesseract_result = ocr_results[0] if not isinstance(ocr_results[0], Exception) else None
    easyocr_result = ocr_results[1] if not isinstance(ocr_results[1], Exception) else None
    paddleocr_result = ocr_results[2] if not isinstance(ocr_results[2], Exception) else None

    tracker.update(3, "success", "OCR processing completed", {
        "tesseract_chars": len(tesseract_result) if tesseract_result else 0,
        "easyocr_chars": len(easyocr_result) if easyocr_result else 0,
        "paddleocr_chars": len(paddleocr_result) if paddleocr_result else 0,
    })

    return tesseract_result, easyocr_result, paddleocr_result


async def call_ollama_model(session: aiohttp.ClientSession, base_url: str, model: str, prompt: str, tracker: ProgressTracker) -> Dict:
    """Make async call to Ollama model with enhanced error handling."""
    start_time = time.time()
    tracker.update(5, "processing", f"Calling model: {model}")
    
    # Model uygunluk kontrolü (ekstra güvenlik)
    if not validate_model_for_check_analysis(model):
        error_msg = f"Model '{model}' is not suitable for check analysis (vision/code/embedding model)"
        tracker.update(5, "error", error_msg)
        return {"model_name": model, "analysis": None, "error": error_msg}
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json"  # Ollama'ya JSON format istediğimizi söyle
    }
    
    try:
        tracker.update(5, "processing", f"Sending request to {model}...", {
            "payload_size": len(json.dumps(payload))
        })
        
        async with session.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=180)
        ) as response:
            
            tracker.update(5, "info", f"Model {model} responded with status: {response.status}")
            
            if response.status != 200:
                error_text = await response.text()
                tracker.update(5, "error", f"Model {model} failed", {"status": response.status, "error": error_text})
                return {"model_name": model, "analysis": None, "error": f"HTTP {response.status}: {error_text}"}
            
            response_data = await response.json()
            response_text = response_data.get("response", "")
            
            elapsed = time.time() - start_time
            tracker.update(5, "success", f"Model {model} completed", {
                "response_length": len(response_text),
                "elapsed": round(elapsed, 2)
            })
            
            try:
                # JSON parsing with better error handling
                response_text = response_text.strip()
                
                # Sometimes models add extra text before/after JSON
                if not response_text.startswith('{') and '{' in response_text:
                    start_idx = response_text.find('{')
                    end_idx = response_text.rfind('}') + 1
                    if start_idx != -1 and end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                        tracker.update(5, "info", f"Extracted JSON from model {model} response")
                
                analysis = json.loads(response_text)
                tracker.update(5, "success", f"Model {model} returned valid JSON analysis")
                return {"model_name": model, "analysis": analysis, "error": None}
                
            except json.JSONDecodeError as e:
                # Daha detaylı JSON hata analizi
                tracker.update(5, "error", f"Model {model} returned invalid JSON", {
                    "error": str(e),
                    "response_preview": response_text[:200] if response_text else "Empty response"
                })
                
                # Eğer response açık text ise, kullanıcıya öner
                if len(response_text) > 50 and not response_text.strip().startswith('{'):
                    suggestion = f"Model returned plain text instead of JSON. This model may not support structured output."
                    return {"model_name": model, "analysis": None, "error": f"Invalid JSON: {suggestion}"}
                else:
                    return {"model_name": model, "analysis": None, "error": f"JSON parsing failed: {str(e)}"}
                
    except asyncio.TimeoutError:
        elapsed = time.time() - start_time
        tracker.update(5, "error", f"Model {model} timed out after {elapsed:.2f}s")
        return {"model_name": model, "analysis": None, "error": "Request timeout"}
    except Exception as e:
        elapsed = time.time() - start_time
        tracker.update(5, "error", f"Model {model} failed after {elapsed:.2f}s", {"error": str(e)})
        return {"model_name": model, "analysis": None, "error": str(e)}


async def process_models_parallel(base_url: str, models: List[str], prompt: str, tracker: ProgressTracker) -> List[Dict]:
    """Process multiple models in parallel with progress tracking."""
    tracker.update(5, "processing", f"Starting parallel processing of {len(models)} models")
    
    async with aiohttp.ClientSession() as session:
        tasks = [call_ollama_model(session, base_url, model, prompt, tracker) for model in models]
        results = await asyncio.gather(*tasks)
    
    successful_models = sum(1 for r in results if r["error"] is None)
    tracker.update(5, "success", f"All models processed", {
        "total_models": len(models),
        "successful": successful_models,
        "success_rate": f"{successful_models}/{len(models)}"
    })
    
    return results


def validate_image_file(image_file: UploadFile, tracker: ProgressTracker) -> None:
    """Validate uploaded image file with progress tracking."""
    tracker.update(1, "processing", f"Validating image file: {image_file.filename}")
    
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if image_file.content_type not in allowed_types:
        tracker.update(1, "error", f"Invalid file type: {image_file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file type: {image_file.content_type}. Allowed: {', '.join(allowed_types)}"
        )
    
    tracker.update(1, "success", f"Image file validated: {image_file.content_type}")


def validate_models(selected_models_json: str, tracker: ProgressTracker) -> List[str]:
    """Validate and parse selected models JSON with progress tracking."""
    tracker.update(1, "processing", "Validating selected models")
    
    try:
        selected_models = json.loads(selected_models_json)
        if not isinstance(selected_models, list) or not all(isinstance(m, str) for m in selected_models):
            raise ValueError("Models must be a list of strings")
        
        tracker.update(1, "success", f"Models validated: {selected_models}")
        return selected_models
    except Exception as e:
        tracker.update(1, "error", f"Invalid models JSON: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid selected_models_json: {e}"
        )


def combine_ocr_results(tesseract_text: Optional[str], easyocr_text: Optional[str], paddle_text: Optional[str], tracker: ProgressTracker) -> str:
    """Combine OCR results intelligently with progress tracking."""
    tracker.update(3, "processing", "Combining OCR results...")

    valid_results = [text for text in [tesseract_text, easyocr_text, paddle_text] if text and text.strip()]
    
    if not valid_results:
        tracker.update(3, "error", "No valid OCR results to combine")
        return ""

    combined = "\n---OCR SEPARATION---\n".join(valid_results)
    
    tracker.update(3, "success", f"OCR results combined: {len(combined)} total characters")
    return combined


# ===== BACKGROUND PROCESSING =====

async def process_check_background(
    session_id: str,
    image_bytes: bytes,
    selected_models: List[str],
    base_url: str
):
    """Background task to process check analysis."""
    tracker = ProgressTracker(session_id)
    
    try:
        # Phase 1: Image Processing
        tracker.update(1, "processing", "Starting image preprocessing...")
        processed_image = preprocess_image(image_bytes)
        tracker.update(1, "success", f"Image preprocessing completed ({len(image_bytes)} bytes)")
        
        # Phase 2-3: OCR Processing
        ocr_tesseract, ocr_easyocr, ocr_paddle = await run_ocr_parallel(processed_image, tracker)
        combined_text = combine_ocr_results(ocr_tesseract, ocr_easyocr, ocr_paddle, tracker)
        
        if not combined_text:
            tracker.update(3, "error", "No text extracted from image")
            tracker.set_error("OCR failed: No text could be extracted from the image")
            return
        
        # Phase 4: Prompt Preparation
        tracker.update(4, "processing", "Loading and preparing prompt template...")
        prompt_template = load_prompt()
        final_prompt = prompt_template.replace("${ocr_text}", combined_text)
        tracker.update(4, "success", f"Prompt prepared ({len(final_prompt)} characters)")
        
        # Phase 5: LLM Analysis
        analyses = await process_models_parallel(base_url, selected_models, final_prompt, tracker)
        
        # Phase 6: Results
        successful_analyses = [a for a in analyses if a["error"] is None]
        
        if not successful_analyses:
            tracker.update(6, "error", "All model analyses failed")
            tracker.set_error(f"All models failed. Errors: {[a['error'] for a in analyses]}")
            return
        
        result = {
            "raw_ocr_tesseract": ocr_tesseract,
            "raw_ocr_easyocr": ocr_easyocr,
            "raw_ocr_paddleocr": ocr_paddle,
            "llm_analyses": analyses,
            "processing_time": round(time.time() - tracker.start_time, 2),
            "success_rate": f"{len(successful_analyses)}/{len(selected_models)}"
        }
        
        tracker.update(6, "success", f"Analysis completed successfully! ({len(successful_analyses)}/{len(selected_models)} models)")
        tracker.set_result(result)
        
    except Exception as e:
        tracker.update(6, "error", f"Unexpected error: {str(e)}")
        tracker.set_error(str(e))


# ===== API ENDPOINTS =====

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/api/ollama-models")
async def list_ollama_models(ollama_url: str = Query(None)):
    """List available Ollama models suitable for check analysis."""
    base_url = ollama_url or OLLAMA_API_BASE_URL
    logger.info(f"📋 Fetching Ollama models from: {base_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/api/tags", timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"❌ Ollama API error {response.status}: {error_text}")
                    raise HTTPException(status_code=503, detail=f"Ollama API error: {error_text}")
                
                data = await response.json()
                
                # Handle different Ollama API response formats
                if isinstance(data, dict) and "models" in data:
                    all_models = data["models"]
                else:
                    all_models = data
                
                # Filter unsuitable models
                supported_models = filter_supported_models(all_models)
                
                if not supported_models:
                    logger.warning("⚠️ No suitable models found for check analysis")
                    logger.info("💡 Recommended models: llama2:7b, mistral:7b, deepseek-r1:14b")
                    raise HTTPException(
                        status_code=404, 
                        detail="No suitable models found. Please install text analysis models like: llama2:7b, mistral:7b, or deepseek-r1:14b"
                    )
                
                logger.info(f"✅ Found {len(supported_models)} suitable models out of {len(all_models)} total")
                return supported_models
                
    except asyncio.TimeoutError:
        logger.error("⏰ Ollama service timeout")
        raise HTTPException(status_code=503, detail=f"Ollama service at {base_url} timeout")
    except Exception as e:
        logger.error(f"❌ Failed to connect to Ollama: {e}")
        raise HTTPException(status_code=503, detail=f"Ollama service at {base_url} not reachable: {e}")


@app.post("/api/ocr-check-async")
async def ocr_check_async(
    background_tasks: BackgroundTasks,
    image_file: UploadFile = File(...),
    selected_models_json: str = Form(...),
    ollama_url: str = Query(None),
):
    """Start async OCR and check analysis, returns session ID for progress tracking."""
    session_id = str(uuid.uuid4())
    
    # Quick validation
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if image_file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid image file type")
    
    try:
        selected_models = json.loads(selected_models_json)
        if not isinstance(selected_models, list):
            raise ValueError("Models must be a list")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid selected_models_json")
    
    # Read image and start background processing
    image_bytes = await image_file.read()
    base_url = ollama_url or OLLAMA_API_BASE_URL
    
    background_tasks.add_task(
        process_check_background,
        session_id,
        image_bytes,
        selected_models,
        base_url
    )
    
    return {"session_id": session_id, "message": "Processing started"}


@app.get("/api/progress/{session_id}")
async def get_progress(session_id: str):
    """Get current progress for a session."""
    if session_id not in progress_storage:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return progress_storage[session_id]


@app.get("/api/progress-stream/{session_id}")
async def progress_stream(session_id: str):
    """Server-Sent Events stream for real-time progress updates."""
    
    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events."""
        last_log_count = 0
        
        while True:
            if session_id not in progress_storage:
                yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
                break
            
            session_data = progress_storage[session_id]
            
            # Send new logs only
            new_logs = session_data["logs"][last_log_count:]
            if new_logs:
                for log in new_logs:
                    yield f"data: {json.dumps(log)}\n\n"
                last_log_count = len(session_data["logs"])
            
            # Check if completed or errored
            if session_data["status"] in ["completed", "error"]:
                # Send final status
                yield f"data: {json.dumps({'status': session_data['status'], 'final': True})}\n\n"
                break
            
            await asyncio.sleep(0.5)  # Poll every 500ms
    
    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.post("/api/ocr-check")
async def ocr_check_sync(
    image_file: UploadFile = File(...),
    selected_models_json: str = Form(...),
    ollama_url: str = Query(None),
):
    """Synchronous OCR and check analysis (original endpoint for backward compatibility)."""
    session_id = str(uuid.uuid4())
    tracker = ProgressTracker(session_id)
    
    try:
        # Validation
        validate_image_file(image_file, tracker)
        selected_models = validate_models(selected_models_json, tracker)
        base_url = ollama_url or OLLAMA_API_BASE_URL
        
        # Image Processing
        image_bytes = await image_file.read()
        tracker.update(1, "processing", f"Image loaded: {len(image_bytes)} bytes")
        
        processed_image = preprocess_image(image_bytes)
        tracker.update(1, "success", "Image preprocessing completed")
        
        # OCR Processing
        ocr_tesseract, ocr_easyocr, ocr_paddle = await run_ocr_parallel(processed_image, tracker)
        combined_text = combine_ocr_results(ocr_tesseract, ocr_easyocr, ocr_paddle, tracker)
        
        if not combined_text:
            raise HTTPException(status_code=422, detail="OCR failed: No text could be extracted")
        
        # Prompt Preparation
        tracker.update(4, "processing", "Loading and preparing prompt template...")
        prompt_template = load_prompt()
        final_prompt = prompt_template.replace("${ocr_text}", combined_text)
        tracker.update(4, "success", f"Prompt prepared ({len(final_prompt)} characters)")
        
        # LLM Analysis
        analyses = await process_models_parallel(base_url, selected_models, final_prompt, tracker)
        
        successful_analyses = [a for a in analyses if a["error"] is None]
        
        if not successful_analyses:
            raise HTTPException(status_code=503, detail="All models failed")
        
        tracker.update(6, "success", "Analysis completed successfully!")
        
        response_data = {
            "raw_ocr_tesseract": ocr_tesseract,
            "raw_ocr_easyocr": ocr_easyocr,
            "raw_ocr_paddleocr": ocr_paddle,
            "llm_analyses": analyses,
            "processing_time": round(time.time() - tracker.start_time, 2),
            "success_rate": f"{len(successful_analyses)}/{len(selected_models)}"
        }
        
        return JSONResponse(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        tracker.update(6, "error", f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info("🚀 Turkish Check Analyzer API v3.0 starting up...")
    logger.info("✅ Real-time progress tracking enabled!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level=LOG_LEVEL.lower())