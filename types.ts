export interface CheckDetails {
  // LLM output structure (as per the prompt)
  iban: string | null;
  account_holder: string | null;
  amount_number: string | number | null;
  amount_text: string | null;
  check_number: string | null;
  date: string | null;
  bank_name: string | null;
  side: "Front" | "Back" | "Unknown" | null;
}

export interface LLMAnalysis {
  model_name: string;
  analysis: CheckDetails | null;
  error?: string | null; // Error specific to this LLM's processing
}

// Represents the new overall response structure from /api/ocr-check
export interface FullCheckAnalysisResponse {
  raw_ocr_tesseract: string | null;
  raw_ocr_easyocr: string | null;
  llm_analyses: LLMAnalysis[];
}

export interface ProcessingError {
  step: string; // e.g., 'Image Upload', 'Check Processing', 'Model Fetch'
  message: string;
}

// Type for models fetched from Ollama
export interface OllamaModel {
  details: any;
  name: string;
  modified_at: string;
  size: number;
}
