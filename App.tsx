// App.tsx
import React, { useState, useCallback, useEffect } from "react";
import { RefreshCw, HelpCircle, FileText } from "lucide-react";

// Components
import { ModelSelector } from "./components/ModelSelector";
import { ImageUpload } from "./components/ImageUpload";
import { CheckDisplay } from "./components/CheckDisplay";
import { ProgressTracker } from "./components/ProgressTracker";
import { ErrorMessage } from "./components/ErrorMessage";
import { SetupInstructionsModal } from "./components/SetupInstructionsModal";
import { ReportPage } from "./pages/ReportPage";

// Types
import {
  OllamaModel,
  LLMAnalysis,
  ProcessingError,
  CheckAnalysisResponse,
  CheckDetails,
  CheckResult,
} from "./types";

const GARANTI_GREEN = "#1EA48A";
const BACKEND_BASE_URL = "http://localhost:8000";

const App: React.FC = () => {
  // Page State
  const [currentPage, setCurrentPage] = useState<"analysis" | "report">(
    "analysis"
  );

  // State Management
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ocrTesseract, setOcrTesseract] = useState<string | null>(null);
  const [ocrEasyOcr, setOcrEasyOcr] = useState<string | null>(null);
  const [llmAnalyses, setLlmAnalyses] = useState<LLMAnalysis[] | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");

  const [availableOllamaModels, setAvailableOllamaModels] = useState<
    OllamaModel[]
  >([]);
  const [selectedOllamaModels, setSelectedOllamaModels] = useState<string[]>(
    []
  );
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    () => localStorage.getItem("ollamaUrl") || "http://localhost:11434"
  );

  // Timing tracking
  const [processingTimes, setProcessingTimes] = useState<{
    modelFetch?: { start: number; end: number; duration: number };
    imageUpload?: { start: number; end: number; duration: number };
    imageProcessing?: { start: number; end: number; duration: number };
    ocrProcessing?: { start: number; end: number; duration: number };
    llmProcessing?: { start: number; end: number; duration: number };
    totalProcessing?: { start: number; end: number; duration: number };
  }>({});

  const recordTiming = (
    phase: string,
    startTime?: number,
    endTime?: number
  ) => {
    const now = Date.now();
    if (startTime && endTime) {
      setProcessingTimes((prev) => ({
        ...prev,
        [phase]: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        },
      }));
    } else if (startTime) {
      setProcessingTimes((prev) => ({
        ...prev,
        [phase]: {
          start: startTime,
          end: 0,
          duration: 0,
        },
      }));
    }
  };

  // Helper Functions
  const checkForSetupError = (errorMessage: string) => {
    const lowerErrorMessage = errorMessage.toLowerCase();
    if (
      lowerErrorMessage.includes("tesseract") ||
      lowerErrorMessage.includes("easyocr") ||
      lowerErrorMessage.includes("pytesseract") ||
      lowerErrorMessage.includes("ocr tool") ||
      (lowerErrorMessage.includes("setup") &&
        lowerErrorMessage.includes("incomplete"))
    ) {
      setShowSetupModal(true);
    }
  };

  // Show report page if we have results
  if (currentPage === "report" && (uploadedImage || llmAnalyses)) {
    return (
      <ReportPage
        uploadedImage={uploadedImage}
        ocrTesseract={ocrTesseract}
        ocrEasyOcr={ocrEasyOcr}
        llmAnalyses={llmAnalyses}
        selectedModels={selectedOllamaModels}
        processingTimes={processingTimes}
        onBack={() => setCurrentPage("analysis")}
      />
    );
  }

  const fetchOllamaModels = async () => {
    const startTime = Date.now();
    setIsLoading(true);
    setCurrentStep("Fetching available LLM models from Ollama...");
    setError(null);
    recordTiming("modelFetch", startTime);

    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/ollama-models?ollama_url=${encodeURIComponent(
          ollamaUrl
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Failed to fetch models (HTTP ${response.status}): ${response.statusText}. Is the backend server at ${BACKEND_BASE_URL} running?`,
        }));
        const detailMessage =
          errorData.detail || `Failed to fetch models: ${response.status}`;
        checkForSetupError(detailMessage);
        throw new Error(detailMessage);
      }

      const models: OllamaModel[] = await response.json();
      setAvailableOllamaModels(models);

      // Auto-select first model if none selected
      if (models.length > 0 && selectedOllamaModels.length === 0) {
        setSelectedOllamaModels([models[0].name]);
      }

      const endTime = Date.now();
      recordTiming("modelFetch", startTime, endTime);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching models.";
      setError({ step: "Model Fetch", message: errorMessage });
      checkForSetupError(errorMessage);

      const endTime = Date.now();
      recordTiming("modelFetch", startTime, endTime);
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  // Event Handlers
  const handleModelSelectionChange = (
    modelName: string,
    isSelected: boolean
  ) => {
    setSelectedOllamaModels((prev) =>
      isSelected
        ? [...prev, modelName]
        : prev.filter((name) => name !== modelName)
    );
  };

  const processSingleImage = useCallback(
    async (file: File): Promise<CheckResult | null> => {
      const totalStartTime = Date.now();
      recordTiming("totalProcessing", totalStartTime);

      setError(null);
      setCurrentStep("");
      setProcessingTimes({});

      const imageUploadStart = Date.now();
      recordTiming("imageUpload", imageUploadStart);

      let base64ImageWithMime: string;
      try {
        base64ImageWithMime = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsDataURL(file);
        });
        setUploadedImage(base64ImageWithMime);
      } catch {
        setError({ step: "Image Upload", message: "Failed to read file." });
        return null;
      }

      const imageUploadEnd = Date.now();
      recordTiming("imageUpload", imageUploadStart, imageUploadEnd);

      const formData = new FormData();
      formData.append("image_file", file);
      formData.append(
        "selected_models_json",
        JSON.stringify(selectedOllamaModels)
      );

      try {
        const processingStart = Date.now();
        recordTiming("imageProcessing", processingStart);

        setCurrentStep("Processing image and extracting text...");

        const response = await fetch(
          `${BACKEND_BASE_URL}/api/ocr-check?ollama_url=${encodeURIComponent(
            ollamaUrl
          )}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = {
              message: `Server error (HTTP ${response.status}): ${response.statusText}`,
              detail: `Server error (HTTP ${response.status}): ${response.statusText}. Is the backend server at ${BACKEND_BASE_URL} running?`,
            };
          }
          console.error("Backend error:", errorData);
          const detailMessage =
            errorData.detail ||
            errorData.message ||
            `Server error: ${response.status}`;
          checkForSetupError(detailMessage);
          throw new Error(detailMessage);
        }

        setCurrentStep("Analyzing with AI models...");
        const data: CheckAnalysisResponse = await response.json();

        const processingEnd = Date.now();
        recordTiming("imageProcessing", processingStart, processingEnd);

        if (data.processing_time) {
          recordTiming(
            "llmProcessing",
            processingStart,
            processingStart + data.processing_time * 1000
          );
        }

        setOcrTesseract(data.raw_ocr_tesseract);
        setOcrEasyOcr(data.raw_ocr_easyocr);
        setLlmAnalyses(data.llm_analyses);

        const totalEndTime = Date.now();
        recordTiming("totalProcessing", totalStartTime, totalEndTime);

        return {
          imageSrc: base64ImageWithMime,
          ocrTesseract: data.raw_ocr_tesseract,
          ocrEasyOcr: data.raw_ocr_easyocr,
          llmAnalyses: data.llm_analyses,
        };
      } catch (err) {
        console.error(err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError({
          step: "Check Processing",
          message: `Failed to process check: ${errorMessage}`,
        });
        checkForSetupError(errorMessage);
        recordTiming("totalProcessing", totalStartTime, Date.now());
        return null;
      }
    },
    [selectedOllamaModels, ollamaUrl]
  );

  const handleImagesUpload = useCallback(
    async (files: File[]) => {
      if (selectedOllamaModels.length === 0) {
        setError({
          step: "Setup",
          message:
            "Please select at least one Ollama model to proceed with analysis.",
        });
        return;
      }

      setCheckResults([]);
      setIsLoading(true);
      for (const file of files) {
        const result = await processSingleImage(file);
        if (result) {
          setCheckResults((prev) => [...prev, result]);
        }
      }
      setIsLoading(false);
      setCurrentStep("");
    },
    [processSingleImage, selectedOllamaModels]
  );

  const formatKeyForPdf = (key: string): string => {
    if (key.toLowerCase() === "iban") return "IBAN";
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
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
    setCurrentStep("Generating comprehensive PDF report...");

    try {
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = margin;

      const checkAndAddNewPage = (spaceNeeded: number) => {
        if (currentY + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      };

      // ===== TITLE PAGE =====
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 164, 138); // Garanti Green
      doc.text("Turkish Check Analysis Report", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 15;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      // ===== PERFORMANCE SUMMARY =====
      if (
        processingTimes.totalProcessing &&
        processingTimes.totalProcessing.duration > 0
      ) {
        checkAndAddNewPage(25);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("📊 Performance Summary", margin, currentY);
        currentY += 10;

        // Performance breakdown
        const performanceData = [
          {
            phase: "Model Connection",
            duration: processingTimes.modelFetch?.duration || 0,
            percentage: processingTimes.modelFetch
              ? (processingTimes.modelFetch.duration /
                  processingTimes.totalProcessing.duration) *
                100
              : 0,
          },
          {
            phase: "Image Upload",
            duration: processingTimes.imageUpload?.duration || 0,
            percentage: processingTimes.imageUpload
              ? (processingTimes.imageUpload.duration /
                  processingTimes.totalProcessing.duration) *
                100
              : 0,
          },
          {
            phase: "OCR & AI Processing",
            duration: processingTimes.imageProcessing?.duration || 0,
            percentage: processingTimes.imageProcessing
              ? (processingTimes.imageProcessing.duration /
                  processingTimes.totalProcessing.duration) *
                100
              : 0,
          },
        ].filter((item) => item.duration > 0);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        performanceData.forEach((item, index) => {
          checkAndAddNewPage(6);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.phase}:`, margin + 5, currentY);
          const labelWidth = doc.getTextWidth(`${item.phase}: `);

          doc.setFont("helvetica", "normal");
          doc.text(
            `${formatDuration(item.duration)} (${item.percentage.toFixed(1)}%)`,
            margin + 5 + labelWidth,
            currentY
          );
          currentY += 6;
        });

        // Total time
        checkAndAddNewPage(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text(
          `🏁 Total Processing Time: ${formatDuration(
            processingTimes.totalProcessing.duration
          )}`,
          margin + 5,
          currentY
        );
        currentY += 15;
      }

      currentY += 10;

      // Analysis Summary
      const successfulAnalyses =
        llmAnalyses?.filter((a) => a.error === null) || [];
      const totalAnalyses = llmAnalyses?.length || 0;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Models Used: ${selectedOllamaModels.join(", ")}`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 5;
      doc.text(
        `Success Rate: ${successfulAnalyses.length}/${totalAnalyses} models`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 20;

      // ===== PROCESSING JOURNEY SECTION =====
      checkAndAddNewPage(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 164, 138);
      doc.text("⏱️ Processing Journey & Timing", margin, currentY);
      currentY += 12;

      // Format timing display
      const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}m`;
      };

      const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString();
      };

      // Journey Steps with actual timing data
      const journeySteps = [
        {
          step: "1. Model Connection & Validation",
          description: "Connected to Ollama service and validated models",
          details: processingTimes.modelFetch
            ? `⏱️ Duration: ${formatDuration(
                processingTimes.modelFetch.duration
              )}\n🕐 Started: ${formatTime(
                processingTimes.modelFetch.start
              )}\n✅ Completed: ${formatTime(processingTimes.modelFetch.end)}`
            : "⚠️ Timing data not available",
          icon: "🔗",
        },
        {
          step: "2. Image Upload & Preprocessing",
          description: `Uploaded check image (${
            uploadedImage ? "Success" : "Not available"
          })`,
          details: processingTimes.imageUpload
            ? `⏱️ Upload Duration: ${formatDuration(
                processingTimes.imageUpload.duration
              )}\n🕐 Started: ${formatTime(
                processingTimes.imageUpload.start
              )}\n✅ Image validated and preprocessed`
            : uploadedImage
            ? "✅ Image successfully processed"
            : "❌ No image uploaded",
          icon: "📤",
        },
        {
          step: "3. OCR Text Extraction",
          description: "Dual OCR processing with Tesseract and EasyOCR",
          details: `Tesseract: ${
            ocrTesseract
              ? `${ocrTesseract.length} chars extracted`
              : "No text extracted"
          }\nEasyOCR: ${
            ocrEasyOcr
              ? `${ocrEasyOcr.length} chars extracted`
              : "No text extracted"
          }\n${
            processingTimes.imageProcessing
              ? `⏱️ Processing Time: ${formatDuration(
                  processingTimes.imageProcessing.duration
                )}`
              : ""
          }`,
          icon: "🔍",
        },
        {
          step: "4. AI Model Analysis",
          description: `Analyzed with: ${selectedOllamaModels.join(", ")}`,
          details: `${successfulAnalyses.length} successful, ${
            totalAnalyses - successfulAnalyses.length
          } failed\n${
            processingTimes.llmProcessing
              ? `⏱️ Analysis Duration: ${formatDuration(
                  processingTimes.llmProcessing.duration
                )}`
              : ""
          }\n${
            processingTimes.totalProcessing
              ? `🏁 Total Process Time: ${formatDuration(
                  processingTimes.totalProcessing.duration
                )}`
              : ""
          }`,
          icon: "🤖",
        },
        {
          step: "5. Results & PDF Generation",
          description: "Comprehensive analysis completed and PDF generated",
          details: `✅ PDF report generated successfully\n📊 Analysis Success Rate: ${Math.round(
            (successfulAnalyses.length / totalAnalyses) * 100
          )}%\n📝 Report generated: ${new Date().toLocaleTimeString()}`,
          icon: "📄",
        },
      ];

      journeySteps.forEach((journeyStep, index) => {
        checkAndAddNewPage(25);

        // Step header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`${journeyStep.icon} ${journeyStep.step}`, margin, currentY);
        currentY += 7;

        // Description
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(journeyStep.description, margin + 5, currentY);
        currentY += 5;

        // Details
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const detailLines = doc.splitTextToSize(
          journeyStep.details,
          contentWidth - 10
        );
        detailLines.forEach((line: string) => {
          checkAndAddNewPage(4);
          doc.text(line, margin + 5, currentY);
          currentY += 4;
        });
        currentY += 5;
      });

      currentY += 10;

      // ===== UPLOADED IMAGE SECTION =====
      if (uploadedImage) {
        checkAndAddNewPage(30);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("📸 Original Check Image", margin, currentY);
        currentY += 12;

        const imgProps = doc.getImageProperties(uploadedImage);
        const imgWidth = Math.min(contentWidth, 120);
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        checkAndAddNewPage(imgHeight + 10);

        doc.addImage(
          uploadedImage,
          "PNG",
          margin,
          currentY,
          imgWidth,
          imgHeight
        );
        currentY += imgHeight + 15;
      }

      // ===== OCR RESULTS SECTION =====
      if (ocrTesseract || ocrEasyOcr) {
        checkAndAddNewPage(20);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("🔍 OCR Extraction Results", margin, currentY);
        currentY += 12;

        if (ocrTesseract) {
          checkAndAddNewPage(15);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(
            `📝 Tesseract OCR (${ocrTesseract.length} characters)`,
            margin,
            currentY
          );
          currentY += 8;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          const tesseractLines = doc.splitTextToSize(
            ocrTesseract,
            contentWidth
          );
          tesseractLines.forEach((line: string) => {
            checkAndAddNewPage(4);
            doc.text(line, margin, currentY);
            currentY += 4;
          });
          currentY += 8;
        }

        if (ocrEasyOcr) {
          checkAndAddNewPage(15);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(
            `📝 EasyOCR (${ocrEasyOcr.length} characters)`,
            margin,
            currentY
          );
          currentY += 8;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          const easyocrLines = doc.splitTextToSize(ocrEasyOcr, contentWidth);
          easyocrLines.forEach((line: string) => {
            checkAndAddNewPage(4);
            doc.text(line, margin, currentY);
            currentY += 4;
          });
          currentY += 8;
        }
      }

      // ===== AI ANALYSIS RESULTS SECTION =====
      if (llmAnalyses && llmAnalyses.length > 0) {
        checkAndAddNewPage(20);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("🤖 AI Analysis Results", margin, currentY);
        currentY += 12;

        llmAnalyses.forEach((resultItem, index) => {
          checkAndAddNewPage(20);

          // Model name with status
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          const statusIcon = resultItem.error ? "❌" : "✅";
          doc.text(
            `${statusIcon} Model: ${resultItem.model_name}`,
            margin,
            currentY
          );
          currentY += 8;

          if (resultItem.error) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(220, 53, 69); // Red color for errors
            const errorText = `Error: ${resultItem.error}`;
            const errorLines = doc.splitTextToSize(errorText, contentWidth);
            errorLines.forEach((line: string) => {
              checkAndAddNewPage(5);
              doc.text(line, margin + 5, currentY);
              currentY += 5;
            });
            currentY += 5;
          } else if (resultItem.analysis) {
            const analysis = resultItem.analysis as CheckDetails;

            // Show detected side if available
            if (analysis.side && analysis.side !== "Unknown") {
              doc.setFontSize(10);
              doc.setFont("helvetica", "italic");
              doc.setTextColor(0, 123, 255); // Blue color
              doc.text(
                `🏷️ Detected Side: ${analysis.side}`,
                margin + 5,
                currentY
              );
              currentY += 6;
            }

            // Analysis results in a structured format
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);

            Object.entries(analysis).forEach(([key, value]) => {
              if (
                key === "side" ||
                value === null ||
                value === undefined ||
                value === ""
              )
                return;

              checkAndAddNewPage(6);
              const displayValue =
                typeof value === "number" ? value.toString() : String(value);
              const formattedKey = formatKeyForPdf(key);

              // Key in bold, value in normal
              doc.setFont("helvetica", "bold");
              doc.text(`${formattedKey}: `, margin + 5, currentY);
              const keyWidth = doc.getTextWidth(`${formattedKey}: `);

              doc.setFont("helvetica", "normal");
              const valueLines = doc.splitTextToSize(
                displayValue,
                contentWidth - keyWidth - 10
              );
              doc.text(valueLines[0] || "", margin + 5 + keyWidth, currentY);
              currentY += 5;

              // Handle multi-line values
              if (valueLines.length > 1) {
                valueLines.slice(1).forEach((line: string) => {
                  checkAndAddNewPage(5);
                  doc.text(line, margin + 5 + keyWidth, currentY);
                  currentY += 5;
                });
              }
            });
          } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(128, 128, 128);
            doc.text(
              "No analysis data provided by this model.",
              margin + 5,
              currentY
            );
            currentY += 7;
          }

          // Add separator between models
          if (index < llmAnalyses.length - 1) {
            currentY += 5;
            checkAndAddNewPage(2);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 8;
          }
        });
      }

      // ===== FOOTER ON EACH PAGE =====
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Turkish Check Analyzer • Page ${i} of ${pageCount} • Generated ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      doc.save(`Turkish_Check_Analysis_Report_${timestamp}.pdf`);
    } catch (pdfError) {
      console.error("Failed to generate PDF:", pdfError);
      setError({
        step: "PDF Generation",
        message: "An error occurred while creating the PDF report.",
      });
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  // Effects
  useEffect(() => {
    fetchOllamaModels();
  }, []);

  // Save Ollama URL to localStorage when changed
  useEffect(() => {
    localStorage.setItem("ollamaUrl", ollamaUrl);
  }, [ollamaUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Turkish Check{" "}
              <span style={{ color: GARANTI_GREEN }}>Analyzer</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Advanced AI-powered check analysis using local{" "}
              <strong>Tesseract</strong> & <strong>EasyOCR</strong>, enhanced by{" "}
              <strong>Ollama LLM</strong> models for precise structured data
              extraction.
            </p>

            {/* Ollama URL Configuration */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="ollama-url"
                  className="text-sm font-medium text-gray-700"
                >
                  Ollama URL:
                </label>
                <input
                  id="ollama-url"
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-64 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchOllamaModels}
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "hover:bg-green-700"
                  }`}
                  style={{
                    backgroundColor: isLoading ? undefined : GARANTI_GREEN,
                  }}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  {isLoading ? "Checking..." : "Check Connection"}
                </button>
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Setup instructions"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Model Selection */}
          <ModelSelector
            models={availableOllamaModels}
            selectedModels={selectedOllamaModels}
            onChange={handleModelSelectionChange}
            disabled={isLoading}
          />

          {/* Image Upload */}
          <ImageUpload
            onImageUpload={handleImagesUpload}
            disabled={isLoading || selectedOllamaModels.length === 0}
          />

          {/* Selection Warning */}
          {selectedOllamaModels.length === 0 &&
            !isLoading &&
            availableOllamaModels.length > 0 && (
              <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-medium">
                  Please select at least one Ollama model to enable check
                  analysis.
                </p>
              </div>
            )}

          {/* Loading State */}
          {isLoading && (
            <ProgressTracker
              currentStep={currentStep}
              progress={currentStep.includes("PDF") ? 90 : undefined}
            />
          )}

          {/* Error State */}
          {error && !showSetupModal && (
            <ErrorMessage
              title={`Error during ${error.step}`}
              message={error.message}
            />
          )}

          {/* Results */}
          {!isLoading && checkResults.length > 0 && !error && (
            <div className="space-y-8">
              {checkResults.map((res, idx) => (
                <CheckDisplay
                  key={idx}
                  imageSrc={res.imageSrc}
                  rawOcrTesseract={res.ocrTesseract}
                  rawOcrEasyOcr={res.ocrEasyOcr}
                  llmAnalyses={res.llmAnalyses}
                />
              ))}
            </div>
          )}

          {/* Placeholder State */}
          {!isLoading &&
            checkResults.length === 0 &&
            !error &&
            availableOllamaModels.length > 0 && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ready for Analysis
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  Select your preferred AI models and upload a Turkish bank
                  check to begin intelligent analysis.
                </p>
              </div>
            )}
        </div>
      </main>

      {/* Setup Modal */}
      <SetupInstructionsModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>
              &copy; {new Date().getFullYear()} Turkish Check Analyzer. Powered
              by Local AI Technology.
            </p>
            <p className="mt-1">Backend API: {BACKEND_BASE_URL}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
