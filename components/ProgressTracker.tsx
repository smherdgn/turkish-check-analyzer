// components/ProgressTracker.tsx
import React from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProgressTrackerProps {
  currentStep: string;
  progress?: number;
  phase?: number;
  totalPhases?: number;
}

const GARANTI_GREEN = "#1EA48A";

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  progress = 0,
  phase = 0,
  totalPhases = 6,
}) => {
  const getProgressFromStep = (step: string): number => {
    if (step.includes("Fetching") || step.includes("Validation")) return 10;
    if (step.includes("preprocessing") || step.includes("Processing image"))
      return 20;
    if (step.includes("Extracting") || step.includes("OCR")) return 40;
    if (step.includes("Combining") || step.includes("results")) return 60;
    if (step.includes("Analyzing") || step.includes("AI models")) return 80;
    if (step.includes("PDF") || step.includes("Generating")) return 90;
    return progress;
  };

  const currentProgress = progress || getProgressFromStep(currentStep);

  const phases = [
    "Validation",
    "Image Processing",
    "OCR Extraction",
    "Result Combination",
    "AI Analysis",
    "Complete",
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="text-center mb-6">
        <LoadingSpinner />
        <p className="mt-4 text-gray-700 font-medium text-lg">
          {currentStep || "Processing..."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{currentProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-700 ease-out"
            style={{
              backgroundColor: GARANTI_GREEN,
              width: `${currentProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Phase Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {phases.map((phaseName, index) => {
          const isActive = phase === index + 1;
          const isCompleted = phase > index + 1;
          const isCurrent = phase === index + 1;

          return (
            <div
              key={index}
              className={`text-center p-2 rounded-lg border transition-all duration-300 ${
                isCompleted
                  ? "bg-green-50 border-green-200 text-green-700"
                  : isCurrent
                  ? "bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              <span className="text-xs font-medium">{phaseName}</span>
            </div>
          );
        })}
      </div>

      {/* Estimated Time */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Estimated time: 15-60 seconds depending on image size and model
          complexity
        </p>
      </div>
    </div>
  );
};
