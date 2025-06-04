// components/SetupInstructionsModal.tsx
import React from "react";
import { X, Server, Cpu, Eye, Download, ExternalLink } from "lucide-react";

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupInstructionsModal: React.FC<SetupInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Setup Instructions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              To use the Turkish Check Analyzer, you need to set up the
              following components on your system:
            </p>

            <div className="space-y-6">
              {/* Ollama Setup */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Cpu className="h-6 w-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    1. Ollama LLM Service
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-blue-800">
                  <p>
                    <strong>Install Ollama:</strong>
                  </p>
                  <div className="bg-blue-100 rounded p-3 font-mono text-xs">
                    <p># macOS/Linux:</p>
                    <p>curl -fsSL https://ollama.ai/install.sh | sh</p>
                    <p className="mt-2"># Windows: Download from ollama.ai</p>
                  </div>
                  <p>
                    <strong>Start Ollama and install models:</strong>
                  </p>
                  <div className="bg-blue-100 rounded p-3 font-mono text-xs">
                    <p>ollama serve</p>
                    <p>ollama pull llama2:7b</p>
                    <p>ollama pull deepseek-r1:14b</p>
                  </div>
                  <div className="flex items-center text-blue-700">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    <a
                      href="https://ollama.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Visit ollama.ai for more information
                    </a>
                  </div>
                </div>
              </div>

              {/* Backend Setup */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Server className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-green-900">
                    2. Python Backend Service
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-green-800">
                  <p>
                    <strong>Install dependencies:</strong>
                  </p>
                  <div className="bg-green-100 rounded p-3 font-mono text-xs">
                    <p>pip install fastapi uvicorn aiohttp</p>
                    <p>pip install pytesseract easyocr opencv-python</p>
                    <p>pip install pillow numpy</p>
                  </div>
                  <p>
                    <strong>Start the backend:</strong>
                  </p>
                  <div className="bg-green-100 rounded p-3 font-mono text-xs">
                    <p>python main.py</p>
                    <p># or</p>
                    <p>uvicorn main:app --host 0.0.0.0 --port 8000 --reload</p>
                  </div>
                </div>
              </div>

              {/* OCR Setup */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Eye className="h-6 w-6 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-purple-900">
                    3. OCR Tools Installation
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-purple-800">
                  <p>
                    <strong>Tesseract OCR:</strong>
                  </p>
                  <div className="bg-purple-100 rounded p-3 font-mono text-xs">
                    <p># Ubuntu/Debian:</p>
                    <p>sudo apt-get install tesseract-ocr tesseract-ocr-tur</p>
                    <p className="mt-2"># macOS:</p>
                    <p>brew install tesseract tesseract-lang</p>
                    <p className="mt-2">
                      # Windows: Download from GitHub releases
                    </p>
                  </div>
                  <p>
                    <strong>EasyOCR:</strong> Already included in Python
                    dependencies above
                  </p>
                </div>
              </div>

              {/* Verification */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <Download className="h-6 w-6 text-gray-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    4. Verify Installation
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    <strong>Test each component:</strong>
                  </p>
                  <div className="bg-gray-100 rounded p-3 font-mono text-xs">
                    <p># Test Ollama:</p>
                    <p>curl http://localhost:11434/api/tags</p>
                    <p className="mt-2"># Test Backend:</p>
                    <p>curl http://localhost:8000/api/health</p>
                    <p className="mt-2"># Test Tesseract:</p>
                    <p>tesseract --version</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> All services should be running
                simultaneously for the application to work properly. The
                frontend expects the backend on port 8000 and Ollama on port
                11434.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
