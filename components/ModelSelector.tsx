// components/ModelSelector.tsx
import React from "react";
import { Zap, CheckCircle } from "lucide-react";
import { OllamaModel } from "../types";

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModels: string[];
  onChange: (modelName: string, isSelected: boolean) => void;
  disabled: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModels,
  onChange,
  disabled,
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <Zap className="h-5 w-5 mr-2 text-green-600" />
      Available Ollama Models
    </h2>
    {models.length === 0 ? (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-2">No models available</p>
        <p className="text-xs text-gray-400">
          Please check your Ollama connection and ensure models are installed
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {models.map((model) => (
          <label
            key={model.name}
            className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedModels.includes(model.name)
                ? "border-green-500 bg-green-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="checkbox"
              checked={selectedModels.includes(model.name)}
              onChange={(e) => onChange(model.name, e.target.checked)}
              disabled={disabled}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                selectedModels.includes(model.name)
                  ? "bg-green-500 border-green-500"
                  : "border-gray-300"
              }`}
            >
              {selectedModels.includes(model.name) && (
                <CheckCircle className="h-3 w-3 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-700 truncate block">
                {model.name}
              </span>
              {model.details?.parameter_size && (
                <span className="text-xs text-gray-500 block">
                  {model.details.parameter_size}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    )}
  </div>
);
