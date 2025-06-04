# Turkish Check OCR and Analysis API

This project provides a Python backend service using FastAPI to process scanned images of Turkish bank checks. It utilizes local OCR engines (Tesseract and EasyOCR) to extract text and a locally running Ollama LLM (e.g., LLaMA 3) to analyze the extracted text and return a structured JSON result.

## Features

-   **API Endpoints**:
    -   `GET /api/ollama-models`: Lists available models from the local Ollama instance.
    -   `POST /api/ocr-check`: For uploading check images and selecting Ollama models for analysis.
-   **Image Pre-processing**: Includes grayscale conversion, denoising, skew correction, adaptive thresholding using OpenCV and Pillow.
-   **Dual OCR**: Extracts text using both Tesseract OCR and EasyOCR.
-   **Multi-LLM Analysis**: Sends combined OCR text to one or more selected local Ollama LLM instances with a custom prompt for structured data extraction (e.g., IBAN, amount, date, check side).
-   **Configurable**: Ollama API URL and prompt template can be configured.

## Folder Structure

```
project/
├── app.py                   # FastAPI application logic
├── requirements.txt         # Python package dependencies
├── README.md                # This file
├── prompts/
│   └── check_prompt.txt     # Prompt template for the Ollama LLM
└── utils/
    ├── image_utils.py       # Image pre-processing functions
    └── ocr_utils.py         # OCR extraction functions
```

## Prerequisites

1.  **Python**: Python 3.10 or newer.
2.  **Tesseract OCR Engine**:
    *   **Linux (Ubuntu/Debian)**:
        ```bash
        sudo apt update
        sudo apt install tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng
        ```
    *   **macOS (using Homebrew)**:
        ```bash
        brew install tesseract tesseract-lang
        ```
    *   **Windows**: Download and run the installer from the [Tesseract at UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) page. Ensure you add Tesseract to your system's PATH environment variable during installation, and install the Turkish (`tur`) and English (`eng`) language packs.
    *   Verify installation: `tesseract --version`

3.  **Ollama**:
    *   Install Ollama from [ollama.ai](https://ollama.ai/).
    *   Pull the models you want to use (e.g., LLaMA 3, Mistral):
        ```bash
        ollama pull llama3
        ollama pull mistral
        ```
    *   Ensure Ollama is running (typically `ollama serve` starts automatically or you can run it manually). By default, it serves on `http://localhost:11434`.

4.  **EasyOCR Dependencies**: EasyOCR relies on PyTorch. While `pip install easyocr` usually handles this, ensure you have a compatible PyTorch version if you encounter issues. For CPU-only:
    ```bash
    # Usually handled by easyocr install, but if not:
    # pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    ```

## Setup

1.  **Clone the repository or create the project files** as provided.

2.  **Navigate to the project directory**:
    ```bash
    cd project
    ```

3.  **Create and activate a virtual environment** (recommended):
    ```bash
    python -m venv venv
    # On Windows
    # venv\Scripts\activate
    # On macOS/Linux
    # source venv/bin/activate
    ```

4.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Verify `prompts/check_prompt.txt`**: Ensure this file exists and contains the prompt for the LLM. Modify it as needed for your specific requirements.

6.  **Environment Variables (Optional but recommended for Ollama config in `app.py` if not hardcoded)**:
    You can configure the base Ollama API URL by setting an environment variable if the `app.py` is designed to use it:
    *   `OLLAMA_API_BASE_URL`: Defaults to `http://localhost:11434`. The Python script will append `/api/tags` or `/api/generate` as needed.

    Example for Linux/macOS:
    ```bash
    export OLLAMA_API_BASE_URL="http://my-ollama-host:11434"
    ```
    Example for Windows (Command Prompt):
    ```bash
    set OLLAMA_API_BASE_URL=http://my-ollama-host:11434
    ```

## Running the Application

1.  **Ensure Ollama is running** and the desired models are available.

2.  **Start the FastAPI application using Uvicorn**:
    From within the `project` directory:
    ```bash
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `--reload`: Enables auto-reload on code changes (useful for development).
    *   The API will be available at `http://localhost:8000`.

## API Usage

### Endpoint: `GET /api/ollama-models`

Returns a list of available models from the local Ollama instance.

#### Example using `curl`:
```bash
curl -X GET "http://localhost:8000/api/ollama-models" -H "accept: application/json"
```

#### Successful Response (Example JSON):
Status: `200 OK`
```json
[
  {
    "name": "llama3:latest",
    "modified_at": "2023-10-27T10:00:00.000Z",
    "size": 4700000000
  },
  {
    "name": "mistral:latest",
    "modified_at": "2023-10-26T12:00:00.000Z",
    "size": 4100000000
  }
]
```

### Endpoint: `POST /api/ocr-check`

Accepts a `multipart/form-data` request.

-   **`image_file`**: The check image file (e.g., PNG, JPG, WEBP).
-   **`selected_models_json`**: A JSON string array of selected Ollama model names (e.g., `["llama3:latest", "mistral:latest"]`).

#### Example using `curl`:

```bash
curl -X POST "http://localhost:8000/api/ocr-check" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "image_file=@/path/to/your/check_image.png" \
     -F "selected_models_json='[\"llama3:latest\"]'"
```
Replace `/path/to/your/check_image.png` with the actual path to an image file.

#### Successful Response (Example JSON):

Status: `200 OK`

```json
{
  "raw_ocr_tesseract": "Raw text extracted by Tesseract...",
  "raw_ocr_easyocr": "Raw text extracted by EasyOCR...",
  "llm_analyses": [
    {
      "model_name": "llama3:latest",
      "analysis": {
        "iban": "TR123456789012345678901234",
        "account_holder": "AHMET YILMAZ",
        "amount_number": 1250.00,
        "amount_text": "BİN İKİ YÜZ ELLİ TÜRK LİRASI",
        "check_number": "0012345",
        "date": "2023-10-26",
        "bank_name": "ÖRNEK BANKASI A.Ş.",
        "side": "Front"
      },
      "error": null
    },
    {
      "model_name": "mistral:latest",
      "analysis": null,
      "error": "Model failed to process the request: Timeout."
    }
  ]
}
```
The exact fields and their values in the `analysis` object will depend on each LLM's interpretation of the OCR text based on the provided prompt. If an LLM fails, its `analysis` will be `null` and `error` will contain a message.

#### Error Responses:

-   `400 Bad Request`: Invalid file type, image could not be loaded, or `selected_models_json` missing/invalid.
-   `422 Unprocessable Entity`: OCR failed to extract any text or other validation error.
-   `500 Internal Server Error`: Unexpected server error (e.g., prompt file missing, critical error in processing).
-   `503 Service Unavailable`: Ollama service is not reachable or one/all selected models returned an error during generation.

## Development Notes

-   **Image Pre-processing**: The steps in `utils/image_utils.py` (denoising, skew correction, thresholding) are general. You might need to fine-tune their parameters or the sequence of operations based on the quality and characteristics of your input check images for optimal OCR results.
-   **OCR Engine Choice**: Tesseract is generally good for printed text. EasyOCR can be better for varied text. Using both and providing the combined text to the LLM is a robust strategy.
-   **LLM Prompt Engineering**: The quality of the JSON output heavily depends on the prompt in `prompts/check_prompt.txt`. Experiment with this prompt. Ollama's `format: "json"` parameter (if used by the backend) helps, but a clear prompt is crucial.
-   **Ollama Model**: The choice of LLM (e.g., `llama3`, `mistral`, `phi3`) can significantly impact processing time and the quality of the extracted JSON.
-   **Logging**: The current backend uses `print()`. For production, consider Python's `logging` module.
-   **Frontend-Backend Contract**: Ensure the JSON structures (especially for `POST /api/ocr-check` request and response) stay synchronized between the frontend (`types.ts`) and backend (`app.py`).
```