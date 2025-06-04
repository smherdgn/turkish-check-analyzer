# Turkish Check OCR and Analysis API

This project provides a Python backend service using FastAPI to process scanned images of Turkish bank checks. It utilizes local OCR engines (Tesseract and EasyOCR) to extract text and a locally running Ollama LLM (e.g., LLaMA 3) to analyze the extracted text and return a structured JSON result. This backend is designed to be used with a corresponding frontend application that handles image uploads and displays results.

## Features

- **API Endpoints**:
  - `GET /api/ollama-models`: Lists available models from the local Ollama instance.
  - `POST /api/ocr-check`: For uploading check images and selecting Ollama models for analysis.
- **Image Pre-processing**: Includes grayscale conversion, denoising, skew correction, adaptive thresholding using OpenCV and Pillow.
- **Dual OCR**: Extracts text using both Tesseract OCR and EasyOCR.
- **Multi-LLM Analysis**: Sends combined OCR text to one or more selected local Ollama LLM instances with a custom prompt for structured data extraction (e.g., IBAN, amount, date, check side).
- **Configurable**: Ollama API URL (for backend-to-Ollama communication) and prompt template can be configured.

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

    - **Linux (Ubuntu/Debian)**:
      ```bash
      sudo apt update
      sudo apt install tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng
      ```
    - **macOS (using Homebrew)**:
      Install Tesseract core:
      ```bash
      brew install tesseract
      ```
      For language packs:
      Option 1: Install all available language packs (large):
      ```bash
      brew install tesseract-lang
      ```
      Option 2: Install specific language packs (e.g., Turkish and English). Download the `.traineddata` files (e.g., `tur.traineddata`, `eng.traineddata`) from [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast). Place them in Tesseract's `tessdata` directory. You can find this directory path by running:
      ```bash
      tesseract --print-tessdata-dir
      ```
    - **Windows**: Download and run the installer from the [Tesseract at UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) page. Ensure you check "Add Tesseract to system's PATH" during installation. Also, select and install the necessary language packs (at least "Turkish" and "English").
    - **Verify installation** (on all platforms): Open a terminal/command prompt and type `tesseract --version`. You should see the version information.

3.  **Ollama**:

    - Install Ollama from [ollama.com](https://ollama.com/) (previously ollama.ai).
    - Pull the models you want to use (e.g., LLaMA 3, Mistral):
      ```bash
      ollama pull llama3
      ollama pull mistral
      ```
    - Ensure Ollama is running (typically `ollama serve` starts automatically or you can run it manually). By default, it serves on `http://localhost:11434`.

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

3.  **Create and activate a virtual environment**: Using a virtual environment is strongly recommended to manage dependencies and avoid conflicts.

    ```bash
    python -m venv venv
    # On Windows
    # .\venv\Scripts\activate
    # On macOS/Linux
    # source venv/bin/activate
    ```

4.  **Install Python dependencies** into your active virtual environment:

    ```bash
    pip install -r requirements.txt
    ```

5.  **Verify `prompts/check_prompt.txt`**: Ensure this file exists and contains the prompt for the LLM. Modify it as needed for your specific requirements.

6.  **Environment Variables for Backend (Optional)**:
    The `app.py` script can be configured to use an environment variable for the Ollama API base URL if you need to change it from the default `http://localhost:11434`.

    - `OLLAMA_API_BASE_URL`: Set this if your Ollama instance runs on a different host or port. The Python script appends `/api/tags` or `/api/generate` as needed.

    Example for Linux/macOS:

    ```bash
    export OLLAMA_API_BASE_URL="http://my-ollama-host:12345"
    ```

    Example for Windows (Command Prompt):

    ```bash
    set OLLAMA_API_BASE_URL=http://my-ollama-host:12345
    ```

## Running the Application

1.  **Ensure Ollama is running** and the desired models are available.
2.  **Activate your virtual environment** if not already active.
3.  **Start the FastAPI application using Uvicorn**:
    From within the `project` directory:
    ```bash
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
    ```
    - `--reload`: Enables auto-reload on code changes (useful for development).
    - The API will be available at `http://localhost:8000`. You can access the interactive API documentation at `http://localhost:8000/docs`.

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

- **`image_file`**: The check image file (e.g., PNG, JPG, WEBP).
- **`selected_models_json`**: A JSON string array of selected Ollama model names (e.g., `["llama3:latest", "mistral:latest"]`).

#### Example using `curl`:

```bash
curl -X POST "http://localhost:8000/api/ocr-check" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "image_file=@/path/to/your/check_image.png" \
     -F "selected_models_json='[\"llama3:latest\"]'"
```

Replace `/path/to/your/check_image.png` with the actual path to an image file. Note the single quotes around the JSON string for `selected_models_json` if using shell commands.

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
        "amount_number": 1250.0,
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

The API will return appropriate HTTP status codes for errors. The response body will typically be a JSON object with a `detail` key.

- **`400 Bad Request`**: Invalid input.
  _Example JSON Response:_
  ```json
  {
    "detail": "Invalid image file type. Please upload a PNG, JPG, or WEBP file."
  }
  ```
  ```json
  { "detail": "selected_models_json is missing or invalid." }
  ```
- **`422 Unprocessable Entity`**: Valid input format, but cannot be processed.
  _Example JSON Response:_
  ```json
  {
    "detail": "OCR processing failed: No text could be extracted from the image after pre-processing."
  }
  ```
- **`500 Internal Server Error`**: Unexpected server error.
  _Example JSON Response:_
  ```json
  {
    "detail": "An unexpected error occurred on the server, e.g., prompt file missing."
  }
  ```
- **`503 Service Unavailable`**: Ollama service is not reachable or a critical error occurred with all selected models.
  _Example JSON Response:_
  ```json
  {
    "detail": "Ollama service at http://localhost:11434 not reachable. Please ensure Ollama is running."
  }
  ```

## Development Notes

- **Image Pre-processing**: The steps in `utils/image_utils.py` (denoising, skew correction, thresholding) are general. You might need to fine-tune their parameters or the sequence of operations based on the quality and characteristics of your input check images for optimal OCR results.
- **OCR Engine Choice**: Tesseract is generally good for printed text. EasyOCR can be better for varied text. Using both and providing the combined text to the LLM is a robust strategy.
- **LLM Prompt Engineering**: The quality of the JSON output heavily depends on the prompt in `prompts/check_prompt.txt`. Experiment with this prompt. Ollama's `format: "json"` parameter (if used by the backend when calling Ollama) helps, but a clear prompt is crucial.
- **Ollama Model**: The choice of LLM (e.g., `llama3`, `mistral`, `phi3`) can significantly impact processing time and the quality of the extracted JSON.
- **Logging**: The current backend uses `print()` for some informational messages. For production or more detailed debugging, consider integrating Python's `logging` module.
- **Frontend-Backend Contract**: Ensure the JSON structures (especially for `POST /api/ocr-check` request and response) stay synchronized between the frontend (e.g., `types.ts`) and backend (`app.py`).

```

```

## License

This project is licensed under the [MIT License](LICENSE).

