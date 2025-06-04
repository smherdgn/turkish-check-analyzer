// types/index.ts
export interface ProcessingError {
  step: string;
  message: string;
}

export interface OllamaModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface LLMAnalysis {
  model_name: string;
  analysis?: Record<string, any>;
  error?: string | null;
}

// Result for a single processed check image
export interface CheckResult {
  imageSrc: string;
  ocrTesseract: string | null;
  ocrEasyOcr: string | null;
  llmAnalyses: LLMAnalysis[] | null;
}

export interface CheckAnalysisResponse {
  raw_ocr_tesseract: string | null;
  raw_ocr_easyocr: string | null;
  llm_analyses: LLMAnalysis[];
  processing_time?: number;
  success_rate?: string;
}

export interface CheckDetails {
  side?: string;
  bank_name?: string;
  amount?: string;
  date?: string;
  receiver?: string;
  check_number?: string;
  branch_code?: string;
  iban?: string;
  [key: string]: any;
}
