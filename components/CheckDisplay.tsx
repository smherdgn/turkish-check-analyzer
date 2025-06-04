// components/CheckDisplay.tsx
import React from "react";
import { Eye, FileText, Shield, AlertTriangle } from "lucide-react";
import { LLMAnalysis } from "../types";

interface CheckDisplayProps {
  imageSrc: string | null;
  rawOcrTesseract: string | null;
  rawOcrEasyOcr: string | null;
  llmAnalyses: LLMAnalysis[] | null;
}

const formatFieldName = (key: string): string => {
  if (key.toLowerCase() === "iban") return "IBAN";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/\s\w/g, (c) => c.toUpperCase());
};

export const CheckDisplay: React.FC<CheckDisplayProps> = ({
  imageSrc,
  rawOcrTesseract,
  rawOcrEasyOcr,
  llmAnalyses,
}) => (
  <div className="space-y-6">
    {/* Uploaded Image */}
    {imageSrc && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2 text-green-600" />
          Uploaded Check Image
        </h2>
        <div className="flex justify-center">
          <div className="relative rounded-lg overflow-hidden shadow-md border border-gray-200">
            <img
              src={imageSrc}
              alt="Uploaded check"
              className="max-w-full h-auto"
              style={{ maxHeight: "500px" }}
            />
          </div>
        </div>
      </div>
    )}

    {/* OCR Results */}
    {(rawOcrTesseract || rawOcrEasyOcr) && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-green-600" />
          OCR Extraction Results
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rawOcrTesseract && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Tesseract OCR</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {rawOcrTesseract.length} chars
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700 max-h-48 overflow-y-auto border">
                <pre className="whitespace-pre-wrap">{rawOcrTesseract}</pre>
              </div>
            </div>
          )}
          {rawOcrEasyOcr && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">EasyOCR</h3>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {rawOcrEasyOcr.length} chars
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700 max-h-48 overflow-y-auto border">
                <pre className="whitespace-pre-wrap">{rawOcrEasyOcr}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* LLM Analysis Results */}
    {llmAnalyses && llmAnalyses.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-600" />
          AI Analysis Results
        </h2>
        <div className="space-y-6">
          {llmAnalyses.map((analysis, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-green-600" />
                    {analysis.model_name}
                  </h3>
                  {analysis.error ? (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Error
                    </span>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Success
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                {analysis.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800">
                          Analysis Failed
                        </h4>
                        <p className="mt-1 text-sm text-red-700">
                          {analysis.error}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : analysis.analysis ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(analysis.analysis).map(([key, value]) => {
                      if (
                        !value ||
                        value === "" ||
                        value === null ||
                        value === undefined
                      )
                        return null;

                      return (
                        <div
                          key={key}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                        >
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {formatFieldName(key)}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 font-medium break-words">
                            {String(value)}
                          </dd>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">
                      No analysis data returned by this model
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
