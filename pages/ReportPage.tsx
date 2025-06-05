// pages/ReportPage.tsx
import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  Clock,
  BarChart3,
  FileImage,
  Activity,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { LLMAnalysis, CheckDetails } from "../types";

interface ReportPageProps {
  uploadedImage: string | null;
  ocrTesseract: string | null;
  ocrEasyOcr: string | null;
  ocrPaddleOcr: string | null;
  llmAnalyses: LLMAnalysis[] | null;
  selectedModels: string[];
  processingTimes: {
    modelFetch?: { start: number; end: number; duration: number };
    imageUpload?: { start: number; end: number; duration: number };
    imageProcessing?: { start: number; end: number; duration: number };
    llmProcessing?: { start: number; end: number; duration: number };
    totalProcessing?: { start: number; end: number; duration: number };
  };
  onBack: () => void;
}

interface StatusUpdate {
  id: string;
  message: string;
  type: "info" | "success" | "error";
  timestamp: number;
}

const GARANTI_GREEN = "#1EA48A";

// Helper Functions
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

const formatKeyForPdf = (key: string): string => {
  if (key.toLowerCase() === "iban") return "IBAN";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/\s\w/g, (c) => c.toUpperCase());
};

// Status Popup Component
const StatusPopup: React.FC<{
  statuses: StatusUpdate[];
  isGenerating: boolean;
  onClose: () => void;
}> = ({ statuses, isGenerating, onClose }) => {
  if (!isGenerating && statuses.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                Generating PDF Report
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                Report Generated
              </>
            )}
          </h3>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {statuses.map((status) => (
              <div key={status.id} className="flex items-start space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                    status.type === "success"
                      ? "bg-green-100"
                      : status.type === "error"
                      ? "bg-red-100"
                      : "bg-blue-100"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : status.type === "error" ? (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{status.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(status.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isGenerating && (
          <div className="p-4 border-t border-gray-200">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  backgroundColor: GARANTI_GREEN,
                  width: `${Math.min((statuses.length / 8) * 100, 90)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Processing... {statuses.length}/8 steps completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// PDF Preview Component
const PDFPreview: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
}> = ({ isOpen, onClose, pdfBlob }) => {
  if (!isOpen || !pdfBlob) return null;

  const pdfUrl = URL.createObjectURL(pdfBlob);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full h-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">PDF Preview</h3>
          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              download={`Turkish_Check_Analysis_${new Date().getTime()}.pdf`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
              style={{ backgroundColor: GARANTI_GREEN }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4">
          <iframe
            src={pdfUrl}
            className="w-full h-full border border-gray-200 rounded-lg"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
};

export const ReportPage: React.FC<ReportPageProps> = ({
  uploadedImage,
  ocrTesseract,
  ocrEasyOcr,
  ocrPaddleOcr,
  llmAnalyses,
  selectedModels,
  processingTimes,
  onBack,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const successfulAnalyses = llmAnalyses?.filter((a) => a.error === null) || [];
  const totalAnalyses = llmAnalyses?.length || 0;

  const addStatusUpdate = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    const status: StatusUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now(),
    };
    setStatusUpdates((prev) => [...prev, status]);
  };

  const generatePdfReport = async (preview = false) => {
    setIsGeneratingPdf(true);
    setStatusUpdates([]);
    setShowStatusPopup(true);

    try {
      addStatusUpdate("Initializing PDF generator...", "info");
      await new Promise((resolve) => setTimeout(resolve, 300));

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
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

      // Title Page
      addStatusUpdate("Creating title page...", "info");
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 164, 138);
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
      currentY += 10;

      // Processing Journey
      addStatusUpdate("Adding processing journey...", "info");
      checkAndAddNewPage(30);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 164, 138);
      doc.text("⏱️ Processing Journey", margin, currentY);
      currentY += 12;

      const journeySteps = [
        {
          step: "Model Connection",
          details: processingTimes.modelFetch
            ? `${formatDuration(processingTimes.modelFetch.duration)}`
            : "No timing data",
        },
        {
          step: "Image Processing",
          details: processingTimes.imageUpload
            ? `${formatDuration(processingTimes.imageUpload.duration)}`
            : "No timing data",
        },
        {
          step: "OCR & AI Analysis (Triple OCR)",
          details: processingTimes.imageProcessing
            ? `${formatDuration(processingTimes.imageProcessing.duration)}`
            : "No timing data",
        },
      ];

      journeySteps.forEach((step) => {
        checkAndAddNewPage(10);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(step.step, margin, currentY);
        currentY += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(step.details, margin + 5, currentY);
        currentY += 8;
      });

      // Image
      if (uploadedImage) {
        addStatusUpdate("Adding check image...", "info");
        checkAndAddNewPage(30);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("📸 Check Image", margin, currentY);
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

      // OCR Results
      if (ocrTesseract || ocrEasyOcr || ocrPaddleOcr) {
        addStatusUpdate("Adding OCR results...", "info");
        checkAndAddNewPage(20);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("🔍 OCR Results", margin, currentY);
        currentY += 12;

        if (ocrTesseract) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(
            `Tesseract: ${ocrTesseract.length} characters`,
            margin,
            currentY
          );
          currentY += 8;
          const truncatedText =
            ocrTesseract.length > 200
              ? ocrTesseract.substring(0, 200) + "..."
              : ocrTesseract;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(truncatedText, contentWidth);
          lines.slice(0, 10).forEach((line: string) => {
            checkAndAddNewPage(4);
            doc.text(line, margin, currentY);
            currentY += 4;
          });
          currentY += 8;
        }

        if (ocrPaddleOcr) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(
            `PaddleOCR: ${ocrPaddleOcr.length} characters`,
            margin,
            currentY
          );
          currentY += 8;
          const truncated =
            ocrPaddleOcr.length > 200
              ? ocrPaddleOcr.substring(0, 200) + "..."
              : ocrPaddleOcr;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const plines = doc.splitTextToSize(truncated, contentWidth);
          plines.slice(0, 10).forEach((line: string) => {
            checkAndAddNewPage(4);
            doc.text(line, margin, currentY);
            currentY += 4;
          });
          currentY += 8;
        }
      }

      // AI Results
      if (llmAnalyses && llmAnalyses.length > 0) {
        addStatusUpdate("Adding AI analysis results...", "info");
        checkAndAddNewPage(20);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 164, 138);
        doc.text("🤖 AI Analysis", margin, currentY);
        currentY += 12;

        llmAnalyses.forEach((resultItem) => {
          checkAndAddNewPage(15);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          const statusIcon = resultItem.error ? "❌" : "✅";
          doc.text(`${statusIcon} ${resultItem.model_name}`, margin, currentY);
          currentY += 8;

          if (resultItem.error) {
            doc.setFontSize(10);
            doc.setTextColor(220, 53, 69);
            doc.text(`Error: ${resultItem.error}`, margin + 5, currentY);
            currentY += 6;
          } else if (resultItem.analysis) {
            const analysis = resultItem.analysis as CheckDetails;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            Object.entries(analysis).forEach(([key, value]) => {
              if (value !== null && value !== undefined && String(value) !== "") {
                checkAndAddNewPage(5);
                doc.setFont("helvetica", "bold");
                doc.text(`${formatKeyForPdf(key)}: `, margin + 5, currentY);
                const keyWidth = doc.getTextWidth(`${formatKeyForPdf(key)}: `);
                doc.setFont("helvetica", "normal");
                doc.text(String(value), margin + 5 + keyWidth, currentY);
                currentY += 5;
              }
            });
          }
          currentY += 8;
        });
      }

      addStatusUpdate("Finalizing PDF...", "info");
      const pdfOutput = doc.output("blob");
      setPdfBlob(pdfOutput);
      addStatusUpdate("PDF generated successfully!", "success");

      if (preview) {
        setShowPdfPreview(true);
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        doc.save(`Turkish_Check_Analysis_Report_${timestamp}.pdf`);
        addStatusUpdate("PDF downloaded!", "success");
      }
    } catch (pdfError) {
      console.error("Failed to generate PDF:", pdfError);
      addStatusUpdate("Failed to generate PDF", "error");
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => {
        if (!showPdfPreview) {
          setShowStatusPopup(false);
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Analysis
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analysis <span style={{ color: GARANTI_GREEN }}>Report</span>
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => generatePdfReport(true)}
                disabled={isGeneratingPdf}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </button>
              <button
                onClick={() => generatePdfReport(false)}
                disabled={isGeneratingPdf}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white shadow-sm transition-all duration-200 ${
                  isGeneratingPdf
                    ? "bg-gray-400 cursor-not-allowed"
                    : "hover:bg-green-700"
                }`}
                style={{
                  backgroundColor: isGeneratingPdf ? undefined : GARANTI_GREEN,
                }}
              >
                <Download className="h-5 w-5 mr-2" />
                {isGeneratingPdf ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Summary Cards - Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Processing Time Card */}
            {processingTimes.totalProcessing && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Total Time
                </h3>
                <div className="text-center">
                  <div
                    className="text-3xl font-bold mb-2"
                    style={{ color: GARANTI_GREEN }}
                  >
                    {formatDuration(processingTimes.totalProcessing.duration)}
                  </div>
                  <div className="space-y-2 text-sm">
                    {processingTimes.modelFetch && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Connection:</span>
                        <span>
                          {formatDuration(processingTimes.modelFetch.duration)}
                        </span>
                      </div>
                    )}
                    {processingTimes.imageProcessing && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processing:</span>
                        <span>
                          {formatDuration(
                            processingTimes.imageProcessing.duration
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Rate Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                Success Rate
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {Math.round(
                    (successfulAnalyses.length / totalAnalyses) * 100
                  )}
                  %
                </div>
                <div className="text-sm text-gray-600">
                  {successfulAnalyses.length} of {totalAnalyses} models
                </div>
              </div>
            </div>

            {/* OCR Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileImage className="h-5 w-5 mr-2 text-purple-600" />
                OCR Data
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tesseract:</span>
                  <span>
                    {ocrTesseract ? `${ocrTesseract.length} chars` : "No text"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">EasyOCR:</span>
                  <span>
                    {ocrEasyOcr ? `${ocrEasyOcr.length} chars` : "No text"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PaddleOCR:</span>
                  <span>
                    {ocrPaddleOcr ? `${ocrPaddleOcr.length} chars` : "No text"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Processing Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Activity
                  className="h-5 w-5 mr-2"
                  style={{ color: GARANTI_GREEN }}
                />
                Processing Timeline
              </h3>
              <div className="space-y-6">
                {[
                  {
                    phase: "Model Connection",
                    time: processingTimes.modelFetch,
                    icon: "🔗",
                  },
                  {
                    phase: "Image Upload",
                    time: processingTimes.imageUpload,
                    icon: "📤",
                  },
                  {
                    phase: "OCR & AI Processing",
                    time: processingTimes.imageProcessing,
                    icon: "🔍",
                  },
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900">
                          {step.phase}
                        </h4>
                        {step.time && (
                          <span className="text-sm font-medium text-gray-600">
                            {formatDuration(step.time.duration)}
                          </span>
                        )}
                      </div>
                      {step.time && (
                        <p className="text-sm text-gray-500">
                          {formatTime(step.time.start)} →{" "}
                          {formatTime(step.time.end)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Results */}
            {llmAnalyses && llmAnalyses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Analysis Results Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {llmAnalyses.slice(0, 4).map((analysis, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {analysis.model_name}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            analysis.error
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {analysis.error ? "Failed" : "Success"}
                        </span>
                      </div>
                      {analysis.error ? (
                        <p className="text-sm text-red-600 truncate">
                          {analysis.error}
                        </p>
                      ) : analysis.analysis ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(analysis.analysis).map(
                              ([key, value]) =>
                                value && (
                                  <div
                                    key={key}
                                    className="flex justify-between"
                                  >
                                    <span className="text-gray-600 capitalize text-xs">
                                      {key.replace(/_/g, " ")}:
                                    </span>
                                    <span className="font-medium text-xs truncate ml-2">
                                      {String(value)}
                                    </span>
                                  </div>
                                )
                            )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No data</p>
                      )}
                    </div>
                  ))}
                </div>
                {llmAnalyses.length > 4 && (
                  <p className="text-sm text-gray-500 text-center mt-4">
                    +{llmAnalyses.length - 4} more results in full PDF report
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <StatusPopup
        statuses={statusUpdates}
        isGenerating={isGeneratingPdf}
        onClose={() => setShowStatusPopup(false)}
      />

      <PDFPreview
        isOpen={showPdfPreview}
        onClose={() => {
          setShowPdfPreview(false);
          setShowStatusPopup(false);
        }}
        pdfBlob={pdfBlob}
      />
    </div>
  );
};
