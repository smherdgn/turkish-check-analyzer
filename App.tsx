
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { CheckDisplay } from './components/CheckDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { ModelSelector } from './components/ModelSelector';
import { SetupInstructionsModal } from './components/SetupInstructionsModal';
import type { FullCheckAnalysisResponse, LLMAnalysis, ProcessingError, OllamaModel, CheckDetails } from './types';
import { jsPDF } from 'jspdf';
import { DownloadIcon } from 'lucide-react'; // For PDF download button

const GARANTI_GREEN = '#1EA48A';
const PLACEHOLDER_CHECK_IMAGE_URL = `https://placehold.co/600x300/e9f6f4/1EA48A/png?text=Sample%20Garanti%20BBVA%20Check&font=source-sans-pro`;
const MAIN_CONTENT_BACKGROUND_IMAGE_URL = 'https://www.toptal.com/designers/subtlepatterns/uploads/fancy-cushion.png'; // Placeholder for cekgorsel.png

// Define the base URL for your Python backend
const BACKEND_BASE_URL = 'http://localhost:8000'; // Ensure this matches your backend's address

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ocrTesseract, setOcrTesseract] = useState<string | null>(null);
  const [ocrEasyOcr, setOcrEasyOcr] = useState<string | null>(null);
  const [llmAnalyses, setLlmAnalyses] = useState<LLMAnalysis[] | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const [availableOllamaModels, setAvailableOllamaModels] = useState<OllamaModel[]>([]);
  const [selectedOllamaModels, setSelectedOllamaModels] = useState<string[]>([]);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

  const checkForSetupError = (errorMessage: string) => {
    const lowerErrorMessage = errorMessage.toLowerCase();
    if (
      lowerErrorMessage.includes('tesseract') ||
      lowerErrorMessage.includes('easyocr') ||
      lowerErrorMessage.includes('pytesseract') ||
      lowerErrorMessage.includes('ocr tool') ||
      (lowerErrorMessage.includes('setup') && lowerErrorMessage.includes('incomplete'))
    ) {
      setShowSetupModal(true);
    }
  };

  useEffect(() => {
    const fetchOllamaModels = async () => {
      setIsLoading(true);
      setCurrentStep('Fetching available LLM models from Ollama...');
      setError(null);
      try {
        // Use the full backend URL
        const response = await fetch(`${BACKEND_BASE_URL}/api/ollama-models`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: `Failed to fetch models (HTTP ${response.status}): ${response.statusText}. Is the backend server at ${BACKEND_BASE_URL} running?` }));
          const detailMessage = errorData.detail || `Failed to fetch models: ${response.status}`;
          checkForSetupError(detailMessage);
          throw new Error(detailMessage);
        }
        const models: OllamaModel[] = await response.json();
        setAvailableOllamaModels(models);
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching models.';
        setError({ step: 'Model Fetch', message: errorMessage });
        checkForSetupError(errorMessage);
      } finally {
        setIsLoading(false);
        setCurrentStep('');
      }
    };
    fetchOllamaModels();
  }, []);

  const handleModelSelectionChange = (modelName: string, isSelected: boolean) => {
    setSelectedOllamaModels(prev =>
      isSelected ? [...prev, modelName] : prev.filter(name => name !== modelName)
    );
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (selectedOllamaModels.length === 0) {
      setError({ step: 'Setup', message: 'Please select at least one Ollama model to proceed with analysis.' });
      return;
    }
    setError(null);
    setUploadedImage(null);
    setOcrTesseract(null);
    setOcrEasyOcr(null);
    setLlmAnalyses(null);
    setIsLoading(true);
    setCurrentStep('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64ImageWithMime = reader.result as string;
      setUploadedImage(base64ImageWithMime);

      const formData = new FormData();
      formData.append('image_file', file);
      formData.append('selected_models_json', JSON.stringify(selectedOllamaModels));

      try {
        setCurrentStep('Extracting text with Tesseract & EasyOCR...');
        // Use the full backend URL
        const response = await fetch(`${BACKEND_BASE_URL}/api/ocr-check`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { message: `Server error (HTTP ${response.status}): ${response.statusText}`, detail: `Server error (HTTP ${response.status}): ${response.statusText}. Is the backend server at ${BACKEND_BASE_URL} running?` };
          }
          console.error('Backend error:', errorData);
          const detailMessage = errorData.detail || errorData.message || `Server error: ${response.status}`;
          checkForSetupError(detailMessage);
          throw new Error(detailMessage);
        }
        
        setCurrentStep(`Analyzing extracted text with selected Ollama model(s): ${selectedOllamaModels.join(', ')}...`);
        const data: FullCheckAnalysisResponse = await response.json();
        setOcrTesseract(data.raw_ocr_tesseract);
        setOcrEasyOcr(data.raw_ocr_easyocr);
        setLlmAnalyses(data.llm_analyses);

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError({ step: 'Check Processing', message: `Failed to process check: ${errorMessage}` });
        checkForSetupError(errorMessage);
      } finally {
        setIsLoading(false);
        setCurrentStep('');
      }
    };
    reader.onerror = () => {
      setError({ step: 'Image Upload', message: 'Failed to read file.' });
      setIsLoading(false);
    };
  }, [selectedOllamaModels]);

  const formatKeyForPdf = (key: string) => {
    if (key.toLowerCase() === 'iban') return 'IBAN';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase())
      .replace(/\s\w/g, (c) => c.toUpperCase());
  };

  const generatePdfReport = async () => {
    if (!uploadedImage && !ocrTesseract && !ocrEasyOcr && !llmAnalyses) {
      alert("No data available to generate PDF report.");
      return;
    }

    setIsLoading(true);
    setCurrentStep("Generating PDF report...");

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = margin;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Turkish Check Analysis Report", pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      const checkAndAddNewPage = (spaceNeeded: number) => {
        if (currentY + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      };
      
      // 1. Uploaded Image
      if (uploadedImage) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Uploaded Check Image", margin, currentY);
        currentY += 8;
        
        const imgProps = doc.getImageProperties(uploadedImage);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        checkAndAddNewPage(imgHeight + 5); // +5 for spacing
        doc.addImage(uploadedImage, 'PNG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 10;
      }

      // Helper to add text sections
      const addTextSection = (title: string, textContent: string | null) => {
        if (textContent) {
          checkAndAddNewPage(15); // Space for title + a bit of text
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(title, margin, currentY);
          currentY += 8;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(textContent, contentWidth);
          lines.forEach((line: string) => {
            checkAndAddNewPage(5); // Approx height of one line
            doc.text(line, margin, currentY);
            currentY += 5;
          });
          currentY += 5; // Extra space after section
        }
      };

      addTextSection("Tesseract OCR Output", ocrTesseract);
      addTextSection("EasyOCR Output", ocrEasyOcr);

      // 3. LLM Analyses
      if (llmAnalyses && llmAnalyses.length > 0) {
        checkAndAddNewPage(15);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("LLM Analysis Results", margin, currentY);
        currentY += 10;

        llmAnalyses.forEach((resultItem, index) => {
          checkAndAddNewPage(12); // For model name header
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(`Analysis from: ${resultItem.model_name}`, margin, currentY);
          currentY += 7;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          if (resultItem.error) {
            checkAndAddNewPage(10);
            const errorLines = doc.splitTextToSize(`Error: ${resultItem.error}`, contentWidth);
             errorLines.forEach((line: string) => {
                checkAndAddNewPage(5);
                doc.setTextColor(255, 0, 0); // Red for errors
                doc.text(line, margin, currentY);
                currentY += 5;
            });
            doc.setTextColor(0, 0, 0); // Reset color
            currentY += 5;
          } else if (resultItem.analysis) {
            const analysis = resultItem.analysis as CheckDetails; // Type assertion
            if (analysis.side && analysis.side !== 'Unknown') {
              checkAndAddNewPage(7);
              doc.setFont('helvetica', 'italic');
              doc.text(`Detected Side: ${analysis.side}`, margin, currentY);
              currentY += 7;
              doc.setFont('helvetica', 'normal');
            }
            
            for (const [key, value] of Object.entries(analysis)) {
              if (key === 'side' || value === null || value === undefined || value === '') continue;
              
              checkAndAddNewPage(5);
              const displayValue = typeof value === 'number' ? value.toString() : String(value);
              const formattedLine = `${formatKeyForPdf(key)}: ${displayValue}`;
              const lines = doc.splitTextToSize(formattedLine, contentWidth);
              lines.forEach((line: string) => {
                checkAndAddNewPage(5);
                doc.text(line, margin, currentY);
                currentY += 5;
              });
            }
            currentY += 5; // Space after each model's analysis
          } else {
            checkAndAddNewPage(5);
            doc.text("No analysis data or error provided by this model.", margin, currentY);
            currentY += 7;
          }
          if (index < llmAnalyses.length - 1) currentY += 5; // More space between different LLM results
        });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`Turkish_Check_Analysis_${timestamp}.pdf`);

    } catch (pdfError) {
      console.error("Failed to generate PDF:", pdfError);
      setError({ step: 'PDF Generation', message: 'An error occurred while creating the PDF report.' });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: GARANTI_GREEN }}>
          Turkish Check Analyzer
        </h1>
        <p className="text-lg text-gray-600">
          Upload a Turkish bank check. Text is extracted using local <strong>Tesseract</strong> &amp; <strong>EasyOCR</strong>,
          then analyzed by your choice of local <strong>Ollama LLM(s)</strong> to provide structured details.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          (Frontend API calls target: {BACKEND_BASE_URL})
        </p>
      </header>

      <main 
        className="w-full max-w-4xl shadow-2xl rounded-xl p-6 sm:p-8 relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${MAIN_CONTENT_BACKGROUND_IMAGE_URL})`, // Replace with /cekgorsel.png if you have it in public folder
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08, 
          }}
        />
        <div className="relative z-[1]">
          <ModelSelector
            models={availableOllamaModels}
            selectedModels={selectedOllamaModels}
            onChange={handleModelSelectionChange}
            disabled={isLoading}
          />
          
          <div className="mt-6">
            <ImageUpload onImageUpload={handleImageUpload} disabled={isLoading || selectedOllamaModels.length === 0} />
            {selectedOllamaModels.length === 0 && !isLoading && (
                 <p className="text-sm text-center mt-2" style={{color: GARANTI_GREEN}}>Please select at least one Ollama model above to enable image upload.</p>
            )}
          </div>

          {isLoading && (
            <div className="mt-6 text-center">
              <LoadingSpinner />
              <p style={{ color: GARANTI_GREEN }} className="mt-2 text-sm animate-pulse">{currentStep || 'Processing...'}</p>
            </div>
          )}

          {error && !showSetupModal && (
            <div className="mt-6">
              <ErrorMessage title={`Error during ${error.step}`} message={error.message} />
            </div>
          )}
          
          {!isLoading && (uploadedImage || llmAnalyses) && !error && (
            <div className="mt-8 space-y-6">
              <CheckDisplay
                imageSrc={uploadedImage}
                rawOcrTesseract={ocrTesseract}
                rawOcrEasyOcr={ocrEasyOcr}
                llmAnalyses={llmAnalyses}
              />
               <div className="mt-8 text-center">
                <button
                  onClick={generatePdfReport}
                  disabled={isLoading || (!uploadedImage && !llmAnalyses)}
                  className={`
                    px-6 py-3 text-white font-semibold rounded-lg shadow-md
                    transition-all duration-150 ease-in-out flex items-center justify-center
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${isLoading || (!uploadedImage && !llmAnalyses)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : `bg-[${GARANTI_GREEN}] hover:bg-[#008C73] focus:ring-[${GARANTI_GREEN}]`}
                  `}
                  style={{ minWidth: '180px' }}
                >
                  <DownloadIcon size={20} className="mr-2" />
                  Download PDF Report
                </button>
              </div>
            </div>
          )}
          
          {!isLoading && !uploadedImage && !error && availableOllamaModels.length > 0 && (
            <div className="mt-8 text-center text-gray-500">
              <img 
                src={PLACEHOLDER_CHECK_IMAGE_URL}
                alt="Sample Garanti BBVA Check Placeholder" 
                className="mx-auto rounded-lg shadow-md opacity-90 border border-gray-200"
                width="600"
                height="300"
              />
              <p className="mt-4 text-lg">Select model(s) and upload a check image to begin analysis.</p>
            </div>
          )}
        </div>
      </main>

      <SetupInstructionsModal 
        isOpen={showSetupModal} 
        onClose={() => setShowSetupModal(false)} 
      />

      <footer className="w-full max-w-4xl mt-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Check Analyzer. Powered by Local AI.</p>
      </footer>
    </div>
  );
};

export default App;
